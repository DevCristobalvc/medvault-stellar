# ZKP Primitives Analysis — Stellar Soroban

## Available host functions (Protocol 22)

### BLS12-381 (CAP-0052)

```rust
env.crypto().bls12_381_g1_add(p1: BytesN<96>, p2: BytesN<96>) -> BytesN<96>
env.crypto().bls12_381_g1_mul(p: BytesN<96>, s: BytesN<32>) -> BytesN<96>
env.crypto().bls12_381_g1_msm(vp: Vec<BytesN<96>>, vs: Vec<BytesN<32>>) -> BytesN<96>
env.crypto().bls12_381_g2_add(p1: BytesN<192>, p2: BytesN<192>) -> BytesN<192>
env.crypto().bls12_381_g2_mul(p: BytesN<192>, s: BytesN<32>) -> BytesN<192>
env.crypto().bls12_381_g2_msm(vp: Vec<BytesN<192>>, vs: Vec<BytesN<32>>) -> BytesN<192>
env.crypto().bls12_381_pairing(g1: Vec<BytesN<96>>, g2: Vec<BytesN<192>>) -> BytesN<576>
env.crypto().bls12_381_fr_add(a: BytesN<32>, b: BytesN<32>) -> BytesN<32>
env.crypto().bls12_381_fr_mul(a: BytesN<32>, b: BytesN<32>) -> BytesN<32>
env.crypto().bls12_381_fr_pow(a: BytesN<32>, n: u64) -> BytesN<32>
env.crypto().bls12_381_fr_inv(a: BytesN<32>) -> BytesN<32>
env.crypto().bls12_381_hash_to_g1(msg: Bytes, dst: Bytes) -> BytesN<96>
env.crypto().bls12_381_hash_to_g2(msg: Bytes, dst: Bytes) -> BytesN<192>
env.crypto().bls12_381_map_fp_to_g1(fp: BytesN<48>) -> BytesN<96>
env.crypto().bls12_381_map_fp2_to_g2(fp2: BytesN<96>) -> BytesN<192>
```

### Poseidon (CAP-0075)

```rust
env.crypto().poseidon_hash(inputs: Vec<BytesN<32>>) -> BytesN<32>
```

Sponge construction over BLS12-381 scalar field. Parameters: width=3, rate=2, alpha=5.
Same parameters as many Circom circuits → drop-in compatibility.

## Groth16 Verification with BLS12-381

Groth16 proof: `(A: G1, B: G2, C: G1)`
Public inputs: `[x1, x2, ..., xn]` (field elements)
Verification key: `(alpha: G1, beta: G2, gamma: G2, delta: G2, IC: Vec<G1>)`

Verification equation:
```
e(A, B) == e(alpha, beta) * e(L, gamma) * e(C, delta)
where L = IC[0] + x1*IC[1] + x2*IC[2] + ... + xn*IC[n]
```

In Soroban:
```rust
// Compute L (linear combination of IC with public inputs)
let mut l = ic[0].clone();
for i in 0..public_inputs.len() {
    let xi_point = env.crypto().bls12_381_g1_mul(ic[i+1].clone(), public_inputs[i].clone());
    l = env.crypto().bls12_381_g1_add(l, xi_point);
}

// Check pairing equation
let lhs = env.crypto().bls12_381_pairing(vec![&env, proof_a], vec![&env, proof_b]);
let rhs_1 = env.crypto().bls12_381_pairing(vec![&env, alpha], vec![&env, beta]);
let rhs_2 = env.crypto().bls12_381_pairing(vec![&env, l], vec![&env, gamma]);
let rhs_3 = env.crypto().bls12_381_pairing(vec![&env, proof_c], vec![&env, delta]);

// lhs == rhs_1 * rhs_2 * rhs_3 (in GT field — multiplication)
// In practice: check lhs * inverse(rhs_1 * rhs_2 * rhs_3) == identity
```

## Implementation status

This is no longer a plan — the full path below is **implemented and live**.

| Component | Status |
|---|---|
| Circom circuit (`merkle_membership_stellar`, BLS12-381, 5615 constraints) | ✅ `zkp-jwt/stellar/circuits/` |
| Booleanity hardening (`pathIndices[i]·(1-pathIndices[i])===0`) | ✅ closes circomlib `Mux1` under-constraint |
| Trusted setup (pot14 ptau, single dev contribution) | ✅ `zkp-jwt/stellar/build/` |
| Groth16 verifier in Soroban (`verify_zkp_proof`) | ✅ deployed on `CBYNTUAVZ4OSILWID7HE6AYF7FNOJTT2M77TZJ6GUU32VGBXUCMIUBBK` |
| In-browser proof generation (snarkjs) | ✅ MedVault Protocol page (`frontend/src/lib/zkp/`) |
| On-chain verification fixture + soundness suite | ✅ `zkp-jwt/stellar/test/{verify_onchain,validate_circuit}.mjs` |

## Notes for production (v2)

- The deployed `verify_zkp_proof` is a **real Groth16 verifier**, not a stub: it runs the pairing equation above via
  `env.crypto().bls12_381()` host functions. The verification key is passed as a call argument, so the circuit can be
  rotated without redeploying the contract.
- Before mainnet, replace the single-contribution `zkey` with a **multi-party Powers-of-Tau ceremony**.
- See [`zkp-jwt/stellar/README.md`](../../zkp-jwt/stellar/README.md) for the circuit diagram and the full prove/verify flow.

## External resources

- [Stellar BLS12-381 docs](https://developers.stellar.org/docs/build/smart-contracts/advanced-topics/bls12-381)
- [Stellar Poseidon (CAP-0075)](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0075.md)
- [RISC Zero on Stellar (Nethermind)](https://www.risczero.com/blog/risc-zero-stellar)
- [Groth16 paper](https://eprint.iacr.org/2016/260.pdf)
