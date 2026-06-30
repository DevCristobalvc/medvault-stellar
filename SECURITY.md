# Security

MedVault handles encrypted medical data. This document states what is protected, what is assumed, and what is **not**
yet hardened. It is a self-review, not an external audit.

## Reporting a vulnerability

Open a private security advisory on the GitHub repository, or contact the maintainer directly. Please do not file public
issues for exploitable findings.

## What is protected

See [ARCHITECTURE.md §9](./ARCHITECTURE.md) for the full threat model. In short:

- **Confidentiality of records** — AES-256-GCM client-side; only ciphertext or hashes ever leave the browser.
- **Integrity of records** — the GCM auth tag fails closed on any tampering of the IPFS blob.
- **Write authorization** — every state-mutating contract call enforces `require_auth()` on the acting wallet.
- **Recipient-bound decryption (ECIES)** — the AES key is wrapped to the doctor's on-chain X25519 public key (ephemeral ECDH + HKDF + AES-GCM); only that doctor's wallet can unwrap it. No secret travels in the share link or QR.
- **Tamper-proof expiry** — `verify_access` checks consensus ledger time; tokens live in temporary storage and self-evict.
- **Append-only audit** — no contract path mutates or deletes `AccessEvent` history.
- **Anonymous authorization (ZK)** — `verify_zkp_proof` verifies Groth16 membership proofs on-chain without revealing
  which doctor proved.

## Cryptographic assumptions

| Primitive | Where | Assumption |
|---|---|---|
| AES-256-GCM | record + key wrapping | Web Crypto `SubtleCrypto`; 96-bit random IV per encryption, never reused with the same key |
| X25519 ECDH + HKDF-SHA256 | ECIES key wrapping (`@noble/curves`, `@noble/hashes`) | Computational Diffie-Hellman on Curve25519; fresh ephemeral key per grant; recipient key derived from a wallet signature (`SHA-512(sig)[0..32]`) |
| Groth16 / BLS12-381 | on-chain `verify_zkp_proof` | Soundness of Groth16 + the discrete-log/pairing hardness of BLS12-381 |
| Poseidon (BLS12-381 scalar field) | Merkle hashing | Collision resistance with circomlib's optimized round constants |
| Trusted setup (Powers of Tau + Phase 2) | proving key | At least **one** ceremony contributor was honest and discarded their toxic waste |

## Trusted setup

The proving key is produced by a reproducible, multi-contribution ceremony finalized with a public random beacon
(`zkp-jwt/stellar/setup_stellar.sh`, documented in `zkp-jwt/stellar/CEREMONY.md`). The committed artifacts come from
contributions made on a single developer machine. **For production, the ceremony must be re-run with independent parties
on separate machines and a future, publicly verifiable beacon** (e.g. a Bitcoin block hash at an announced height).

## Circuit soundness

`merkle_membership_stellar.circom` constrains `pathIndices` to `{0,1}` to close an under-constraint in circomlib's
`Mux1` (its selector is not range-checked). Completeness, soundness, and booleanity are exercised by
`zkp-jwt/stellar/test/validate_circuit.mjs` (4/4). This is automated self-testing, **not a formal audit**.

## Known limitations / residual risks

- **Not externally audited.** No third party has reviewed the contract or the circuit.
- **On-chain metadata is public.** Which wallets interacted, timestamps, and `doc_type` are world-readable; the
  relationship graph leaks even though record content stays encrypted.
- **Doctor key custody is client-side.** The doctor's X25519 private key is derived from a wallet signature and persisted
  in `localStorage`; it is not escrowed. A doctor using a new device must re-enroll (`register_pubkey`) before receiving
  new grants, and clearing local storage requires re-enrolling. Cross-device key recovery is future work.
- **IPFS availability** depends on the Pinata pin; losing the pin makes ciphertext unreachable (the on-chain registry
  still proves it existed).
- **Testnet only.** The contract runs on Stellar Testnet; balances and persistence carry no production guarantees.

## Scope

In scope: the Soroban contract, the ZK circuit/verifier, and client-side crypto.
Out of scope: Pinata/IPFS infrastructure, wallet extensions (Freighter et al.), and the user's device/browser.
