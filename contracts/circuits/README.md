# MedVault ZKP Circuits

> **Canonical location:** the production circuit, prover, on-chain verifier reference, and validation suite live in
> [`zkp-jwt/stellar/`](https://github.com/DevCristobalvc/zkp-jwt/tree/Master/stellar). The `merkle_membership.circom`
> in this folder is an **early snapshot** kept for historical reference only — it predates the Stellar port and the
> soundness fix. Do not build from it.

## Status: deployed

The zero-knowledge layer is live, not a plan:

- **Circuit:** `merkle_membership_stellar.circom` — Merkle membership over **BLS12-381 + Poseidon**, 10 levels,
  5615 constraints. `pathIndices` are constrained to `{0,1}` (`pathIndices[i]·(1-pathIndices[i])===0`) to close the
  circomlib `Mux1` selector under-constraint present in the old snapshot here.
- **Proof system:** Groth16 (snarkjs), proved **in the browser** on the MedVault Protocol page.
- **On-chain verifier:** `verify_zkp_proof` on contract `CBYNTUAVZ4OSILWID7HE6AYF7FNOJTT2M77TZJ6GUU32VGBXUCMIUBBK`,
  using Stellar's native BLS12-381 pairing (CAP-0052). The verification key is passed as a call argument, so the
  circuit can be rotated without redeploying the contract.

```
Private inputs:
  walletAddress : field      (doctor's Stellar wallet as a field element)
  siblings[10]  : field      (Merkle path siblings)
  pathIndices[10]: {0,1}     (left/right per level, range-checked)

Public input:
  root : field               (Merkle root of the authorized set, stored on-chain)
```

See [`zkp-jwt/stellar/README.md`](https://github.com/DevCristobalvc/zkp-jwt/blob/Master/stellar/README.md) for the
circuit diagram, the prove/verify flow, and reproduction steps.
