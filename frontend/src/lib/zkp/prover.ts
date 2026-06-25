import { buildTree, getMerkleProof } from './merkle'
import type { ZkProof } from '../stellar'
import vkeyJson from './vkey_bls12381.json'

const WASM_URL = '/zkp/merkle.wasm'
const ZKEY_URL = '/zkp/merkle.zkey'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const vkey = vkeyJson as any

const fp = (s: string) => BigInt(s).toString(16).padStart(96, '0')
const fr = (s: string) => BigInt(s).toString(16).padStart(64, '0')
const g1 = (p: string[]) => fp(p[0]) + fp(p[1])
const g2 = (p: string[][]) => fp(p[0][1]) + fp(p[0][0]) + fp(p[1][1]) + fp(p[1][0])

export const DEFAULT_DOCTOR = 'GAGJANUXK2IRADH7Z5DZKABFZI6VSFZSB6SJDERLZRXBNQUWWDFZQMSH'
export const DEFAULT_AUTHORIZED_SET = [
  DEFAULT_DOCTOR,
  'GDPNCF2LEY6TYUKOW66UGUHDWFMKEPS256CE2OBAI2NRNJWYSWLDZ5WG',
]

export type ProverStage = 'building-tree' | 'proving' | 'verifying-local'

export async function generateMembershipProof(
  walletAddress: string,
  authorizedSet: string[],
  onStage?: (s: ProverStage) => void
): Promise<{ proof: ZkProof; root: string }> {
  onStage?.('building-tree')
  const tree = buildTree(authorizedSet)
  const mp = getMerkleProof(tree, walletAddress)
  const input = {
    walletAddress: mp.walletAddress.toString(),
    pathIndices: mp.pathIndices.map(String),
    siblings: mp.siblings.map((s) => s.toString()),
    root: mp.root.toString(),
  }

  onStage?.('proving')
  const snarkjs = await import('snarkjs')
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM_URL, ZKEY_URL)

  onStage?.('verifying-local')
  const ok = await snarkjs.groth16.verify(vkey, publicSignals, proof)
  if (!ok) throw new Error('Local proof verification failed')

  const zk: ZkProof = {
    merkleRoot: fr(publicSignals[0]),
    proofA: g1(proof.pi_a),
    proofB: g2(proof.pi_b),
    proofC: g1(proof.pi_c),
    ic0: g1(vkey.IC[0]),
    ic1: g1(vkey.IC[1]),
    alphaG1: g1(vkey.vk_alpha_1),
    betaG2: g2(vkey.vk_beta_2),
    gammaG2: g2(vkey.vk_gamma_2),
    deltaG2: g2(vkey.vk_delta_2),
  }
  return { proof: zk, root: zk.merkleRoot }
}
