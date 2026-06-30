# MedVault — Frontend

React 19 + TypeScript + Vite PWA. All cryptography runs client-side: records are AES-256-GCM encrypted in the browser, the AES key is ECIES-wrapped to the recipient doctor's X25519 key, and only ciphertext or hashes ever leave the device. See [`../ARCHITECTURE.md`](../ARCHITECTURE.md) for the full design.

## Setup

```bash
cp .env.example .env.local      # set VITE_CONTRACT_ID, VITE_PINATA_JWT, etc.
npm install
npm run dev                     # http://localhost:5173
```

## Scripts

```bash
npm run build                   # tsc -b && vite build
npx vitest run --no-file-parallelism   # test suite
```

## Environment

```env
VITE_CONTRACT_ID=CAENHTIXAUOJ3AIWINZP3RRJQNADCLQ4HCYJZZV5TFYWRK2WU5VHKCK3
VITE_SOROBAN_RPC=https://soroban-testnet.stellar.org
VITE_PINATA_GATEWAY=gateway.pinata.cloud   # public read gateway (client)
PINATA_JWT=                                # server-side only, read by api/upload.ts
```

Never commit `.env.local`. The Pinata JWT lives server-side in the Vercel serverless function `api/upload.ts`; the client never sees it.

## Key directories

```
src/
├── lib/
│   ├── encryption.ts   # AES-256-GCM record encryption (Web Crypto)
│   ├── ecies.ts        # ECIES wrap/unwrap (X25519 ECDH + HKDF + AES-GCM)
│   ├── eckeys.ts       # X25519 keypair via sign-to-derive
│   ├── doctorkey.ts    # enroll / publish / load recipient key
│   ├── ipfs.ts         # upload via /api/upload, download via public gateway
│   ├── stellar.ts      # Soroban contract client (writes signed, reads simulated)
│   ├── walletKit.ts    # Stellar Wallets Kit (multi-wallet, lazy)
│   └── i18n.ts         # EN / ES / PT
├── components/         # PatientVault, DoctorAccess, DoctorKeySetup, QRGenerator, …
└── pages/              # Home, Patient, Doctor, Protocol, Hackathon
```

## Deploy

Git auto-deploy is disabled; deploy from this directory with `vercel --prod --yes`.
