# MedVault — Sovereign Medical Records on Stellar

> Hackathon: **Stellar PULSO** (NearX + Stellar Development Foundation) · Colombia

**MedVault** gives patients full control over their medical history. Records are encrypted before leaving the browser, stored on IPFS, and access is governed by time-bound smart contracts on Stellar. Every read is logged on-chain — immutably.

**Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md) — data model, crypto design, auth model, threat model  
**Live demo:** https://frontend-eight-virid-j7gyqph2tp.vercel.app  
**Contract (testnet):** `CAUUBZYILFYVHS2IYJDMXR4GUZ2LLYVWR25W7C5PXC7A5PF3QHIUWH2M`  
**Explorer:** https://stellar.expert/explorer/testnet/contract/CAUUBZYILFYVHS2IYJDMXR4GUZ2LLYVWR25W7C5PXC7A5PF3QHIUWH2M

---

## The Problem

70% of doctors in Colombia operate with vulnerable, siloed record systems. When a patient visits a new clinic, the doctor has no access to history without phone calls, signed papers, and days of waiting. Medical data is scattered, insecure, and the patient has zero control over who reads it.

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

    P->>S: grant_access(patient, doctor2, document_id, expires_at)
    S-->>P: token_id
    P->>P: Generate QR → /doctor?token=<token_id>

    D2->>S: verify_access(token_id, doctor2)
    S-->>D2: true (if valid + not expired)
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
**Contract ID:** `CAUUBZYILFYVHS2IYJDMXR4GUZ2LLYVWR25W7C5PXC7A5PF3QHIUWH2M`

### Functions

| Function | Auth | Storage | Description |
|---|---|---|---|
| `register_document` | `doctor.require_auth()` | Persistent | Register encrypted CID on-chain |
| `grant_access` | `patient.require_auth()` | Temporary | Generate time-bound access token (stores encrypted AES key) |
| `verify_access` | None (read) | — | Check token validity and expiry |
| `revoke_access` | `patient.require_auth()` | Temporary | Delete token before expiry |
| `log_access` | `doctor.require_auth()` | Persistent | Record access event in audit log |
| `get_audit_log` | None (read) | — | Retrieve patient's access history |
| `get_patient_documents` | None (read) | — | List all document IDs for a patient |
| `get_document` | None (read) | — | Get document metadata by ID |
| `get_token_info` | None (read) | — | Resolve document_id from token |
| `get_encrypted_key` | None (read) | — | Fetch on-chain encrypted AES key (KEM) |
| `get_doctor_tokens` | None (read) | — | List access tokens issued to a doctor |
| `verify_zkp_proof` | None (read) | — | Groth16 verification via BLS12-381 pairing (CAP-0052) |

> **Auth enforcement:** state-mutating calls invoke `require_auth()` on the acting `Address`, so a transaction only succeeds if the corresponding wallet signed it. Read functions carry no auth — Soroban ledger state is world-readable, so the privacy boundary is the *encryption layer*, not read-side access control.

### Tests

```bash
cd contracts/medvault
cargo test
# 20 tests, 0 failures
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Smart contract | Rust + Soroban SDK v26 |
| Blockchain | Stellar Testnet |
| Wallet | Freighter (browser extension) |
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
- Freighter wallet browser extension

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
VITE_CONTRACT_ID=CAUUBZYILFYVHS2IYJDMXR4GUZ2LLYVWR25W7C5PXC7A5PF3QHIUWH2M
VITE_SOROBAN_RPC=https://soroban-testnet.stellar.org
VITE_PINATA_JWT=<your-pinata-jwt>
VITE_PINATA_GATEWAY=gateway.pinata.cloud
```

---

## Security Model

- **Plaintext never leaves the browser** — files are encrypted with AES-256-GCM (Web Crypto `SubtleCrypto`, 96-bit random IV per file) before any network call. IPFS and Stellar only ever see ciphertext or hashes.
- **The AES key is wrapped, never stored in clear** — a random 256-bit wrapping key encrypts the AES key; the wrapped key is stored on-chain (`AccessToken.encrypted_key`) and the wrapping key travels only in the URL fragment (`#wk=`), which browsers never send to servers. Decryption requires *both* the on-chain token and the link.
- **Write authorization is enforced on-chain** — `register_document`, `grant_access`, `log_access`, and `revoke_access` call `require_auth()` on the acting address. Soroban rejects the invocation unless that wallet authorized the call, so no third party can register documents, mint tokens, forge audit entries, or revoke another patient's grants.
- **Expiry is tamper-proof** — `verify_access` compares against `env.ledger().timestamp()` (consensus ledger time), not client clocks. Tokens live in **temporary storage** and are evicted by the network after their TTL — no server-side invalidation job exists.
- **Decryption happens in RAM only** — plaintext is never written to `localStorage`, `IndexedDB`, or the service-worker cache. The service worker uses `NetworkFirst` / `StaleWhileRevalidate` and explicitly excludes Soroban RPC and IPFS payloads from precaching.
- **Audit trail is append-only** — every `log_access` writes to **persistent storage**; there is no contract path that mutates or deletes existing audit entries.

---

## Zero-Knowledge Verification (working POC)

`verify_zkp_proof` runs a full Groth16 verification on-chain using Stellar's native BLS12-381 pairing host function — `env.crypto().bls12_381().pairing_check` (CAP-0052). The circuit (`merkle_membership_stellar.circom`, Poseidon over the BLS12-381 scalar field) proves a wallet belongs to the authorized-doctor Merkle set without revealing which member it is.

- **Curve/encoding** — G1 points are 96 bytes (`x‖y`, 48 each, big-endian); G2 points are 192 bytes with Fp2 components in `c1`-first order (`x.c1‖x.c0‖y.c1‖y.c0`), matching Stellar's zkcrypto serialization.
- **Pairing equation** — `e(−A, B)·e(α, β)·e(L, γ)·e(C, δ) = 1`, where `L = IC₀ + root·IC₁` (single public input: the Merkle root).
- **JS prover** — Poseidon must be computed over the BLS12-381 scalar field with circomlib's *optimized* round constants (sparse MDS), not the BN254 defaults shipped by `circomlibjs`; see `zkp-jwt/stellar/test/bls_poseidon.mjs`.
- **Reproduce** — `cd zkp-jwt/stellar && DUMP_FIXTURE=1 node test/verify_onchain.mjs` generates a real proof and invokes the deployed contract; returns `true`. The live demo verifies a bundled proof on-chain from the Protocol page.

## Roadmap — v2

- **In-browser proving** — ship the circuit wasm + zkey to generate the membership proof client-side (currently a precomputed proof is verified live on-chain).
- **ECIES key exchange** — encrypt the AES key with the patient's Stellar public key, eliminating out-of-band key sharing.
- **Multi-document vault** — version history, document categories, revocation.
- **Stellar Anchor integration** — for identity verification and KYC.

---

## Project Structure

```
medvault-stellar/
├── contracts/medvault/          # Soroban smart contract (Rust)
│   └── contracts/medvault/src/
│       ├── lib.rs               # Contract logic (12 functions)
│       └── test.rs              # 20 unit tests
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
