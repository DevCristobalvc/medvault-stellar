#!/usr/bin/env bash
# End-to-end integration test against the deployed MedVault contract on Stellar Testnet.
# Exercises the full flow and proves require_auth is enforced on-chain.
#
# Prereqs:
#   - stellar CLI configured with two funded testnet identities: `doctor` and `patient`
#     stellar keys generate doctor  --network testnet && stellar keys fund doctor  --network testnet
#     stellar keys generate patient --network testnet && stellar keys fund patient --network testnet
#
# Usage:
#   CONTRACT_ID=<id> ./integration_test.sh
set -uo pipefail

CONTRACT_ID="${CONTRACT_ID:-CBYNTUAVZ4OSILWID7HE6AYF7FNOJTT2M77TZJ6GUU32VGBXUCMIUBBK}"
NETWORK="${NETWORK:-testnet}"

DR="$(stellar keys address doctor)"
PT="$(stellar keys address patient)"
CID_DATA="QmIntegration-$(date +%s)"
ENC_KEY="$(printf '2a%.0s' $(seq 1 60))"   # 60-byte stand-in for IV||wrapped-AES-key||tag
EXPIRES_AT=4102444800                        # year 2100

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

invoke() { stellar contract invoke --id "$CONTRACT_ID" --network "$NETWORK" "$@"; }

echo "Contract: $CONTRACT_ID"
echo "Doctor:   $DR"
echo "Patient:  $PT"
echo

# 1. register_document — must be signed by the doctor
DOC_ID="$(invoke --source doctor -- register_document --doctor "$DR" --patient "$PT" --cid "$CID_DATA" --doc_type "clinical_history" | tr -d '"')"
[ -n "$DOC_ID" ] || fail "register_document returned empty document_id"
pass "register_document -> $DOC_ID"

# 2. require_auth negative — granting with the wrong signer must be rejected
if invoke --source doctor -- grant_access --patient "$PT" --doctor "$DR" --document_id "$DOC_ID" --expires_at "$EXPIRES_AT" --encrypted_key "$ENC_KEY" >/dev/null 2>&1; then
  fail "grant_access succeeded when signed by doctor (patient.require_auth not enforced)"
fi
pass "grant_access rejected when not signed by patient (require_auth enforced)"

# 3. grant_access — signed by the patient (owner)
TOKEN_ID="$(invoke --source patient -- grant_access --patient "$PT" --doctor "$DR" --document_id "$DOC_ID" --expires_at "$EXPIRES_AT" --encrypted_key "$ENC_KEY" | tr -d '"')"
[ -n "$TOKEN_ID" ] || fail "grant_access returned empty token_id"
pass "grant_access -> $TOKEN_ID"

# 4. verify_access — read, must be true for the granted doctor
[ "$(invoke --source doctor -- verify_access --token_id "$TOKEN_ID" --doctor "$DR")" = "true" ] \
  || fail "verify_access returned false for a valid token"
pass "verify_access -> true"

# 5. get_encrypted_key — wrapped key must round-trip exactly
KEY_BACK="$(invoke --source doctor -- get_encrypted_key --token_id "$TOKEN_ID" | tr -d '"')"
[ "$KEY_BACK" = "$ENC_KEY" ] || fail "get_encrypted_key mismatch"
pass "get_encrypted_key -> wrapped key matches"

# 6. log_access — signed by the doctor performing the access
invoke --source doctor -- log_access --doctor "$DR" --token_id "$TOKEN_ID" --patient "$PT" >/dev/null \
  || fail "log_access failed"
pass "log_access committed"

# 7. get_audit_log — the event must be attributed to the doctor + token
AUDIT="$(invoke --source patient -- get_audit_log --patient "$PT")"
echo "$AUDIT" | grep -q "$TOKEN_ID" || fail "audit log does not contain the token_id"
echo "$AUDIT" | grep -q "$DR"       || fail "audit log does not attribute the doctor"
pass "get_audit_log -> event attributed to doctor + token"

# 8. revoke_access — signed by the patient; token must stop verifying
invoke --source patient -- revoke_access --patient "$PT" --token_id "$TOKEN_ID" >/dev/null \
  || fail "revoke_access failed"
[ "$(invoke --source doctor -- verify_access --token_id "$TOKEN_ID" --doctor "$DR")" = "false" ] \
  || fail "verify_access still true after revoke"
pass "revoke_access -> token invalidated"

echo
echo "All integration checks passed against $NETWORK."
