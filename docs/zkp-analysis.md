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

## Implementation effort estimate

| Component | Effort | Status |
|---|---|---|
| Circom circuit (merkle_membership) | Done | ✅ Exists in zkp-jwt |
| Trusted setup (ptau ceremony) | 2h | Generate with snarkjs |
| Groth16 verifier in Soroban | 3-5 days | Not started |
| Frontend proof generation (snarkjs) | 1-2 days | Adapt from zkp-jwt |
| Integration + tests | 2-3 days | Not started |
| **Total** | **~2 weeks** | — |

## Recommended path for hackathon

Use the `verify_zkp_proof` stub already in the contract + document the full implementation plan.
For a real v3 deployment, follow the Groth16 verifier implementation using BLS12-381 above.

## External resources

- [Stellar BLS12-381 docs](https://developers.stellar.org/docs/build/smart-contracts/advanced-topics/bls12-381)
- [Stellar Poseidon (CAP-0075)](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0075.md)
- [RISC Zero on Stellar (Nethermind)](https://www.risczero.com/blog/risc-zero-stellar)
- [Groth16 paper](https://eprint.iacr.org/2016/260.pdf)
