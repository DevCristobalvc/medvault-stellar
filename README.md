# MedVault — Sovereign Medical Records on Stellar

> Hackathon: **Stellar PULSO** (NearX + Stellar Development Foundation) · Colombia

> **Version:** `v0.5.0` — v3 cryptography: ECIES + sign-to-derive (no copyable key)

**MedVault turns a patient's medical history into something they alone control.** Every record is encrypted in the browser before it touches the network, pinned to IPFS as ciphertext, and gated by time-bound smart contracts on Stellar. The server never holds anything readable, and every single read is written to an immutable on-chain audit log — so the patient always knows who opened their data, from which wallet, and when.

Think of it as a vault where **the patient holds the only key**. Doctors write encrypted records into it; the patient grants scoped, self-expiring access with a QR code; Soroban enforces the rules and keeps the history. There is no central database of plaintext to breach — a full server compromise leaks nothing.

### What makes it different

- **Client-side encryption, always** — AES-256-GCM via the Web Crypto API. Plaintext never leaves the device; IPFS and Stellar only ever see ciphertext or content hashes.
- **Keys wrapped to the recipient, never shared** — the document key is ECIES-wrapped to the doctor's on-chain X25519 public key (derived from a wallet signature, no copyable secret). Reading a record requires *being* that wallet, not holding a link or a fragment.
- **The chain is the gatekeeper** — Soroban stores the document registry, mints access tokens that self-expire from temporary storage, and appends every read to a tamper-proof audit trail. No cron jobs, no server-side session store.
- **Zero-knowledge doctor proofs (ZK)** — `verify_zkp_proof` runs a full Groth16 verification *on-chain* using Stellar's native BLS12-381 pairing host function (CAP-0052). A doctor proves they belong to the authorized-doctor set **without revealing which member they are**. The proof is generated in the browser with snarkjs in ~2 s.

### Technical snapshot

| Layer | What it uses |
|---|---|
| Smart contract | Rust + Soroban SDK v26 · 14 functions · 22 unit tests |
| Cryptography | AES-256-GCM (records) · ECIES X25519 + HKDF-SHA256 (key wrap) · Groth16 / BLS12-381 (zero-knowledge) |
| Storage | IPFS via Pinata — ciphertext only; the chain stores just the CID |
| Frontend | React 19 + TypeScript + Vite · shadcn/ui + Tailwind v4 · installable PWA |
| Networks | Testnet (live public demo) · Mainnet (contract deployed) |

**Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md) — data model, crypto design, auth model, threat model  
**Live demo:** https://medvault-stellar.vercel.app  
**Contract (testnet):** `CAENHTIXAUOJ3AIWINZP3RRJQNADCLQ4HCYJZZV5TFYWRK2WU5VHKCK3`  
**Explorer:** https://stellar.expert/explorer/testnet/contract/CAENHTIXAUOJ3AIWINZP3RRJQNADCLQ4HCYJZZV5TFYWRK2WU5VHKCK3

### Contract deployments

| Version | Network | Contract ID | Notes |
|---|---|---|---|
| `v0.5.1` · enum-hardened | Mainnet | `CCNCFPI2MN4ZUYYQDT2KH25B7V45P6WXFRSQ5LHM4RSSKE75D2LLFFJA` | `docType` locked to a closed enum — no free-text PII can be written to the public ledger. |
| `v0.5` · ECIES (active demo) | Testnet | `CAENHTIXAUOJ3AIWINZP3RRJQNADCLQ4HCYJZZV5TFYWRK2WU5VHKCK3` | Adds `register_pubkey` / `get_pubkey` (X25519 key directory). 14 functions. |
| `v0.4` · KEM (previous) | Testnet | `CBYNTUAVZ4OSILWID7HE6AYF7FNOJTT2M77TZJ6GUU32VGBXUCMIUBBK` | Kept for traceability. 12 functions, covered by `integration_test.sh`. |

---

## The Problem

70% of doctors in Colombia operate with vulnerable, siloed record systems. When a patient visits a new clinic, the doctor has no access to history without phone calls, signed papers, and days of waiting. Medical data is scattered, insecure, and the patient has zero control over who reads it.

**And this is not hypothetical — centralized medical databases are honeypots that keep getting hit:**

- **Colombia, 2022 — Keralty / Sanitas.** The RansomHouse group breached Keralty (operator of EPS Sanitas), exfiltrated ~3 TB and **published patients' ID numbers, phones and addresses** to extort a ransom; appointment scheduling collapsed for what local press reported as ~5.5 million users. ([Infosecurity Magazine](https://www.infosecurity-magazine.com/news/ransomware-target-colombias-health/))
- **Global, 2024 — Change Healthcare.** The **largest healthcare data breach in history**: ~190 million people exposed, a US$22M ransom paid, patients unable to fill prescriptions for weeks. ([HIPAA Journal](https://www.hipaajournal.com/biggest-healthcare-data-breaches-2024/))

The common root cause is the same: patient records sit in **plaintext on a central server somebody else controls**. MedVault removes that honeypot — records are encrypted on the patient's device, so the server and IPFS only ever hold ciphertext. A full breach leaks nothing readable.

## The Solution

MedVault is a **sovereign medical record vault**:

- The doctor encrypts the record with AES-256-GCM **before it leaves the device**
- The encrypted blob goes to IPFS — only the CID (content hash) is stored on Stellar
- The patient generates a **time-bound QR access token** (1h / 24h / 7 days)
- Any doctor who scans the QR can verify access on-chain and decrypt the record in RAM
- Every access is **logged immutably** on Stellar — the patient always knows who read their data

---

## Architecture

```mermaid
graph TB
    subgraph Doctor["👨‍⚕️ Doctor (sender)"]
        A[Write / upload record] --> B[AES-256-GCM encrypt in browser]
        B --> C[Upload ciphertext to IPFS]
        C --> D[register_document on Soroban]
    end

    subgraph Stellar["⭐ Stellar Testnet — Soroban Contract"]
        D --> E[(CID + metadata stored on-chain)]
        F[grant_access] --> G[(Access token — time-bound)]
        H[verify_access] --> I{Valid + not expired?}
        J[log_access] --> K[(Audit log — immutable)]
    end

    subgraph Patient["🧑 Patient (owner)"]
        E --> L[Sees document in vault]
        L --> M[grant_access: select duration]
        M --> F
        F --> N[QR code generated]
    end

    subgraph Doctor2["👩‍⚕️ Doctor (receiver)"]
        N --> O[Scan QR]
        O --> H
        I -->|Yes| P[Download from IPFS]
        P --> Q[Decrypt in RAM]
        Q --> J
        Q --> R[Read record — never saved locally]
        I -->|No| S[Access denied]
    end
```

### Data Flow

```mermaid
sequenceDiagram
    participant D as Doctor
    participant B as Browser (AES-256)
    participant I as IPFS (Pinata)
    participant S as Soroban Contract
    participant P as Patient
    participant D2 as Doctor 2

    D->>B: Write clinical record
    B->>B: generateKey() + encryptFile()
    B->>I: uploadEncryptedPayload(ciphertext, iv)
    I-->>B: CID
    B->>S: register_document(doctor, patient, CID, type)
    S-->>B: document_id

    D2->>D2: sign-to-derive X25519 keypair
    D2->>S: register_pubkey(doctor2, x25519_pub)

    P->>S: get_pubkey(doctor2) → pub
    P->>P: ECIES wrap AES key to pub → blob
    P->>S: grant_access(patient, doctor2, document_id, expires_at, blob)
    S-->>P: token_id
    P->>P: Generate QR → /doctor?token=<token_id> (no secret in link)

    D2->>S: verify_access(token_id, doctor2)
    S-->>D2: true (if valid + not expired)
    D2->>S: get_encrypted_key(token_id) → blob
    D2->>D2: ECIES unwrap blob → AES key
    D2->>I: downloadEncryptedPayload(CID)
    I-->>D2: {ciphertext, iv}
    D2->>B: decryptFile(ciphertext, iv, key) → plaintext in RAM
    D2->>S: log_access(doctor2, token_id, patient)
    Note over S: Immutable audit entry created
```

---

## Stellar Integration — 3 Load-Bearing Points

Stellar is not decorative. These 3 functions make it structurally necessary:

### 1. `register_document` — on-chain document registry
The CID of every encrypted medical record is stored on Stellar, linked to the patient's wallet. No central server, no database — the chain is the registry.

### 2. `grant_access` — time-bound access tokens
Soroban is the gatekeeper. The patient calls `grant_access` with an expiration timestamp. The contract stores the token in **temporary storage** — it self-expires. No cron jobs, no server-side invalidation.

### 3. `log_access` — immutable audit trail
Every read event is written to **persistent storage** on Stellar. The patient can call `get_audit_log` to see exactly who accessed their data, from which wallet, and when.

---

## Smart Contract

**Language:** Rust (Soroban SDK v26)  
**Network:** Stellar Testnet  
**Contract ID:** `CAENHTIXAUOJ3AIWINZP3RRJQNADCLQ4HCYJZZV5TFYWRK2WU5VHKCK3`

### Functions

| Function | Auth | Storage | Description |
|---|---|---|---|
| `register_document` | `doctor.require_auth()` | Persistent | Register encrypted CID on-chain |
| `register_pubkey` | `owner.require_auth()` | Persistent | Publish the owner's X25519 public key (ECIES key directory) |
| `get_pubkey` | None (read) | — | Fetch a wallet's registered X25519 public key |
| `grant_access` | `patient.require_auth()` | Temporary | Generate time-bound access token (stores encrypted AES key) |
| `verify_access` | None (read) | — | Check token validity and expiry |
| `revoke_access` | `patient.require_auth()` | Temporary | Delete token before expiry |
| `log_access` | `doctor.require_auth()` | Persistent | Record access event in audit log |
| `get_audit_log` | None (read) | — | Retrieve patient's access history |
| `get_patient_documents` | None (read) | — | List all document IDs for a patient |
| `get_document` | None (read) | — | Get document metadata by ID |
| `get_token_info` | None (read) | — | Resolve document_id from token |
| `get_encrypted_key` | None (read) | — | Fetch on-chain ECIES-wrapped AES key blob (`version‖eph_pub‖iv‖ct`) |
| `get_doctor_tokens` | None (read) | — | List access tokens issued to a doctor |
| `verify_zkp_proof` | None (read) | — | Groth16 verification via BLS12-381 pairing (CAP-0052) |

> **Auth enforcement:** state-mutating calls invoke `require_auth()` on the acting `Address`, so a transaction only succeeds if the corresponding wallet signed it. Read functions carry no auth — Soroban ledger state is world-readable, so the privacy boundary is the *encryption layer*, not read-side access control.

### Tests

```bash
cd contracts/medvault
cargo test
# 22 tests, 0 failures
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart contract | Rust + Soroban SDK v26 |
| Blockchain | Stellar Testnet |
| Wallet | Stellar Wallets Kit (Freighter, xBull, Albedo, Rabet, Hana, LOBSTR, WalletConnect) |
| Encryption | AES-256-GCM via Web Crypto API (no dependencies) |
| Storage | IPFS via Pinata (free tier) |
| Frontend | React 19 + TypeScript + Vite |
| UI | shadcn/ui (new-york) + Tailwind CSS v4 |
| PWA | vite-plugin-pwa + Workbox |
| Deploy | Vercel |

---

## Local Setup

### Prerequisites

- Node.js 20+
- Rust + `rustup target add wasm32v1-none`
- Stellar CLI: `cargo install --locked stellar-cli`
- A Stellar wallet (Freighter, xBull, Albedo, Rabet, Hana, LOBSTR, or WalletConnect)

### Frontend

```bash
cd frontend
cp .env.example .env.local
# Fill in VITE_CONTRACT_ID, VITE_PINATA_JWT
npm install
npm run dev
```

### Contract (build & test)

```bash
cd contracts/medvault
cargo test                    # run all tests
stellar contract build        # compile to WASM
```

### Deploy contract to testnet

```bash
stellar keys generate deployer --network testnet
stellar network fund <PUBLIC_KEY> --network testnet
stellar contract deploy \
  --wasm target/wasm32v1-none/release/medvault.wasm \
  --source deployer \
  --network testnet
```

---

## Environment Variables

```env
VITE_CONTRACT_ID=CAENHTIXAUOJ3AIWINZP3RRJQNADCLQ4HCYJZZV5TFYWRK2WU5VHKCK3
VITE_SOROBAN_RPC=https://soroban-testnet.stellar.org
VITE_PINATA_JWT=<your-pinata-jwt>
VITE_PINATA_GATEWAY=gateway.pinata.cloud
```

---

## Security Model

- **Plaintext never leaves the browser** — files are encrypted with AES-256-GCM (Web Crypto `SubtleCrypto`, 96-bit random IV per file) before any network call. IPFS and Stellar only ever see ciphertext or hashes.
- **The AES key is ECIES-wrapped to the doctor's public key (v3)** — the doctor publishes an X25519 public key on-chain (`register_pubkey`), derived from a wallet signature (seed = `SHA-512(sig)[0..32]`). The patient reads it (`get_pubkey`) and wraps the document AES key with ephemeral X25519 ECDH + HKDF-SHA256 + AES-GCM, storing `version‖eph_pub‖iv‖ct` in `AccessToken.encrypted_key`. **Nothing travels in the URL or QR** — decrypting requires *being* the doctor wallet, not holding a copyable secret. (v2 wrapped with a random key carried in a `#wk=` fragment; superseded.)
- **Write authorization is enforced on-chain** — `register_document`, `grant_access`, `log_access`, and `revoke_access` call `require_auth()` on the acting address. Soroban rejects the invocation unless that wallet authorized the call, so no third party can register documents, mint tokens, forge audit entries, or revoke another patient's grants.
- **Expiry is tamper-proof** — `verify_access` compares against `env.ledger().timestamp()` (consensus ledger time), not client clocks. Tokens live in **temporary storage** and are evicted by the network after their TTL — no server-side invalidation job exists.
- **Decryption happens in RAM only** — plaintext is never written to `localStorage`, `IndexedDB`, or the service-worker cache. The service worker uses `NetworkFirst` / `StaleWhileRevalidate` and explicitly excludes Soroban RPC and IPFS payloads from precaching.
- **Audit trail is append-only** — every `log_access` writes to **persistent storage**; there is no contract path that mutates or deletes existing audit entries.

---

## Zero-Knowledge Verification (working POC)

`verify_zkp_proof` runs a full Groth16 verification on-chain using Stellar's native BLS12-381 pairing host function — `env.crypto().bls12_381().pairing_check` (CAP-0052). The circuit (`merkle_membership_stellar.circom`, Poseidon over the BLS12-381 scalar field) proves a wallet belongs to the authorized-doctor Merkle set without revealing which member it is.

```mermaid
flowchart TB
    WA["walletAddress (private)"] --> LH["Poseidon(1) → leaf"]
    LH --> CH0["computedHash[0]"]
    subgraph L["per level i = 0 .. 9"]
        PI["pathIndices[i]"] --> BC{{"pathIndices[i]·(1-pathIndices[i]) === 0"}}
        BC -. selector .-> MUX["Mux1 left/right + sibling[i]"]
        CHi["computedHash[i]"] --> MUX
        MUX --> H["Poseidon(2)"] --> CHn["computedHash[i+1]"]
    end
    CH0 --> L --> RC{{"root === computedHash[10]"}}
    RT["root (public)"] --> RC --> OK["valid proof"]
```

The full circuit, its soundness/booleanity suite, and the on-chain verifier reference live in [`zkp-jwt/stellar/`](../zkp-jwt/stellar/README.md). `pathIndices` are explicitly constrained to `{0,1}` to close an under-constraint in circomlib's `Mux1` (its selector is otherwise not range-checked).

- **Curve/encoding** — G1 points are 96 bytes (`x‖y`, 48 each, big-endian); G2 points are 192 bytes with Fp2 components in `c1`-first order (`x.c1‖x.c0‖y.c1‖y.c0`), matching Stellar's zkcrypto serialization.
- **Pairing equation** — `e(−A, B)·e(α, β)·e(L, γ)·e(C, δ) = 1`, where `L = IC₀ + root·IC₁` (single public input: the Merkle root).
- **Prover** — Poseidon must be computed over the BLS12-381 scalar field with circomlib's *optimized* round constants (sparse MDS), not the BN254 defaults shipped by `circomlibjs`. The browser implements it in pure `BigInt` (`frontend/src/lib/zkp/poseidon.ts`); the Node reference is `zkp-jwt/stellar/test/bls_poseidon.mjs`.
- **In-browser proving** — the Protocol page generates the full Groth16 proof client-side with snarkjs (circuit wasm + zkey served statically, read via HTTP Range), then calls `verify_zkp_proof` on the live contract. End-to-end (build Merkle tree → prove → on-chain verify) runs in ~2 s.
- **Reproduce (Node)** — `cd zkp-jwt/stellar && DUMP_FIXTURE=1 node test/verify_onchain.mjs` generates a proof and invokes the deployed contract; returns `true`.

## Roadmap — v2

- **Production trusted setup** — the current zkey uses a single dev contribution; a multi-party ceremony is required before mainnet.
- **TTL extension on `grant_access`** — call `extend_ttl` on the temporary token entry to guarantee it survives until `expires_at` for long-lived grants (e.g. the 7-day option), independent of the network's default temporary TTL.
- **Cross-device key recovery** — ECIES sign-to-derive (shipped in v3) persists the X25519 private key locally; cross-device use depends on `signMessage` being byte-deterministic. Add an encrypted key-escrow fallback for multi-device doctors.
- **Multi-document vault** — version history, document categories, revocation.
- **Stellar Anchor integration** — for identity verification and KYC.

---

## Project Structure

```
medvault-stellar/
├── contracts/medvault/          # Soroban smart contract (Rust)
│   └── contracts/medvault/src/
│       ├── lib.rs               # Contract logic (14 functions)
│       └── test.rs              # 22 unit tests
├── frontend/                    # React PWA
│   ├── src/
│   │   ├── components/          # UI components
│   │   ├── hooks/               # useWallet, useDocuments
│   │   ├── lib/                 # encryption.ts, ipfs.ts, stellar.ts
│   │   └── pages/               # Home, PatientPage, DoctorPage
│   └── public/                  # PWA icons, favicon
└── idea.md                      # Full project context
```

---

*Built for Stellar PULSO Hackathon · June 2026 · Colombia*
