# MedVault ZKP Circuits

## Current status

`merkle_membership.circom` — Merkle membership proof using Poseidon hash.
Copied from `zkp-jwt/circuits/`. Originally built for Arbitrum Stylus (Groth16).

## What needs to change for Stellar/Soroban

### 1. Hash function

Current circuit uses Pedersen hash (from circomlib).
Stellar's native `poseidon_hash` host function uses the same Poseidon construction.

Change needed in circuit:
```circom
// FROM:
include "circomlib/circuits/poseidon.circom";
// TO: use poseidon directly — same interface, Stellar-native
```

Circuit is already using Poseidon in some versions — verify and align parameters.

### 2. Proof system

Current: Groth16 (from SnarkJS)
Stellar native: BLS12-381 pairing operations available via host functions

The Stellar contract can verify a Groth16 proof using BLS12-381 pairing:
```rust
// Groth16 verification equation:
// e(A, B) = e(alpha, beta) * e(L(x), gamma) * e(C, delta)
// Where e() = BLS12-381 pairing

env.crypto().bls12_381_pairing(proof_a, proof_b)  // e(A, B)
// etc.
```

### 3. Integration path

Option A — RISC Zero (Nethermind deployment on Stellar):
- Submit RISC Zero proof to the Stellar RISC Zero verifier contract
- No need to implement pairing verification manually
- Status: available since Sep 2025

Option B — Manual Groth16 via BLS12-381 host functions:
- Implement the 4-pairing verification equation in Rust
- More work but self-contained
- Status: feasible, ~2 weeks of work

Option C — Interstellar (RatherLabs):
- Circom → Soroban pipeline in development
- Status: not yet production-ready

### 4. Circuit parameters for MedVault v3

```
Private inputs:
  - wallet_address: field  (doctor's Stellar wallet)
  - merkle_path: field[10] (siblings in Merkle tree)
  - path_indices: bit[10]  (left/right path indicators)

Public inputs:
  - merkle_root: field     (stored on-chain)

Output:
  - valid: bool            (1 if doctor is in authorized set)
```

### 5. Deployment plan

1. Compile circuit: `circom merkle_membership.circom --r1cs --wasm --sym`
2. Trusted setup: `snarkjs groth16 setup merkle_membership.r1cs pot.ptau`
3. Export verification key → convert to Soroban-compatible format
4. Implement `verify_merkle_proof` in Rust using BLS12-381 host functions
5. Generate proof in frontend (SnarkJS WASM)
6. Submit proof to Soroban contract
