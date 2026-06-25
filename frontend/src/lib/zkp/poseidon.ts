import raw from './poseidon_bls_min.json'

const R = 52435875175126190479447740508185965837690552500527637822603658699938581184513n

const opt = {
  C: raw.C.map((a) => a.map((x) => BigInt(x))),
  M: raw.M.map((m) => m.map((r) => r.map((x) => BigInt(x)))),
  P: raw.P.map((m) => m.map((r) => r.map((x) => BigInt(x)))),
  S: raw.S.map((a) => a.map((x) => BigInt(x))),
}

const N_ROUNDS_F = 8
const N_ROUNDS_P = [56, 57]

const mod = (a: bigint) => ((a % R) + R) % R
const add = (a: bigint, b: bigint) => mod(a + b)
const mul = (a: bigint, b: bigint) => mod(a * b)
const pow5 = (a: bigint) => {
  const a2 = mul(a, a)
  return mul(mul(a2, a2), a)
}

export function poseidon(inputs: bigint[]): bigint {
  const t = inputs.length + 1
  const nRoundsF = N_ROUNDS_F
  const nRoundsP = N_ROUNDS_P[t - 2]
  const C = opt.C[t - 2]
  const S = opt.S[t - 2]
  const M = opt.M[t - 2]
  const P = opt.P[t - 2]

  let state = [0n, ...inputs.map((a) => mod(a))]
  state = state.map((a, i) => add(a, C[i]))

  for (let r = 0; r < nRoundsF / 2 - 1; r++) {
    state = state.map(pow5)
    state = state.map((a, i) => add(a, C[(r + 1) * t + i]))
    state = state.map((_, i) => state.reduce((acc, a, j) => add(acc, mul(M[j][i], a)), 0n))
  }
  state = state.map(pow5)
  state = state.map((a, i) => add(a, C[(nRoundsF / 2 - 1 + 1) * t + i]))
  state = state.map((_, i) => state.reduce((acc, a, j) => add(acc, mul(P[j][i], a)), 0n))

  for (let r = 0; r < nRoundsP; r++) {
    state[0] = pow5(state[0])
    state[0] = add(state[0], C[(nRoundsF / 2 + 1) * t + r])
    const s0 = state.reduce((acc, a, j) => add(acc, mul(S[(t * 2 - 1) * r + j], a)), 0n)
    for (let k = 1; k < t; k++) {
      state[k] = add(state[k], mul(state[0], S[(t * 2 - 1) * r + t + k - 1]))
    }
    state[0] = s0
  }
  for (let r = 0; r < nRoundsF / 2 - 1; r++) {
    state = state.map(pow5)
    state = state.map((a, i) => add(a, C[(nRoundsF / 2 + 1) * t + nRoundsP + r * t + i]))
    state = state.map((_, i) => state.reduce((acc, a, j) => add(acc, mul(M[j][i], a)), 0n))
  }
  state = state.map(pow5)
  state = state.map((_, i) => state.reduce((acc, a, j) => add(acc, mul(M[j][i], a)), 0n))

  return state[0]
}
