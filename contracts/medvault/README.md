# MedVault — Soroban Contract

The on-chain core of MedVault: a registry of encrypted medical-record pointers, time-bound access tokens, an append-only audit log, an X25519 public-key directory for ECIES, and a Groth16 verifier on BLS12-381.

- **Network:** Stellar Testnet
- **Contract ID (v0.5):** `CAENHTIXAUOJ3AIWINZP3RRJQNADCLQ4HCYJZZV5TFYWRK2WU5VHKCK3`
- **Previous (v0.4):** `CBYNTUAVZ4OSILWID7HE6AYF7FNOJTT2M77TZJ6GUU32VGBXUCMIUBBK`
- **SDK:** Soroban SDK v26 — 14 functions, 22 unit tests

The full data model, authorization model, and threat model are documented in [`../../ARCHITECTURE.md`](../../ARCHITECTURE.md).

## Structure

```text
contracts/medvault/
├── contracts/medvault/
│   ├── src/
│   │   ├── lib.rs        # contract logic (14 functions)
│   │   └── test.rs       # 22 unit tests
│   └── Cargo.toml
├── Cargo.toml            # workspace
└── README.md
```

## Functions

- **Records:** `register_document`, `get_document`, `get_patient_documents`
- **Access:** `grant_access`, `verify_access`, `revoke_access`, `get_token_info`, `get_encrypted_key`, `get_doctor_tokens`
- **ECIES key directory:** `register_pubkey`, `get_pubkey`
- **Audit:** `log_access`, `get_audit_log`
- **ZK:** `verify_zkp_proof` (Groth16 / BLS12-381, CAP-0052)

State-mutating calls enforce `require_auth()` on the acting `Address`; reads are simulated without signatures.

## Build & test

```bash
cargo test                              # 22 tests
stellar contract build                  # -> target/wasm32v1-none/release/medvault.wasm
```

## Deploy

```bash
stellar contract deploy \
  --wasm target/wasm32v1-none/release/medvault.wasm \
  --source <identity> --network testnet
```

After deploying, propagate the new contract ID to `frontend/.env.local`, the Vercel `VITE_CONTRACT_ID` env var, `README.md`, `ARCHITECTURE.md`, and the constants in `frontend/src/pages/ProtocolPage.tsx` and `HackathonPage.tsx`.
