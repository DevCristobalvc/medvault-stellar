import { poseidon } from './poseidon'

export const LEVELS = 10
const MAX_LEAVES = 2 ** LEVELS

export function stellarToField(addr: string): bigint {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const ch of addr) {
    const v = alphabet.indexOf(ch)
    if (v >= 0) bits += v.toString(2).padStart(5, '0')
  }
  const keyBits = bits.slice(5, 5 + 256)
  const hex = BigInt('0b' + keyBits).toString(16).padStart(64, '0')
  return BigInt('0x' + '7' + hex.slice(1))
}

interface Tree {
  root: bigint
  leaves: bigint[]
  levels: bigint[][]
}

export function buildTree(addresses: string[]): Tree {
  const leaves = addresses.map((a) => poseidon([stellarToField(a)]))
  const zeroLeaf = poseidon([0n])
  while (leaves.length < MAX_LEAVES) leaves.push(zeroLeaf)
  const levels: bigint[][] = [leaves]
  let current = leaves
  while (current.length > 1) {
    const next: bigint[] = []
    for (let i = 0; i < current.length; i += 2) next.push(poseidon([current[i], current[i + 1]]))
    levels.push(next)
    current = next
  }
  return { root: current[0], leaves, levels }
}

export interface MerkleProof {
  walletAddress: bigint
  pathIndices: number[]
  siblings: bigint[]
  root: bigint
}

export function getMerkleProof(tree: Tree, addr: string): MerkleProof {
  const field = stellarToField(addr)
  const leafHash = poseidon([field])
  const leafIndex = tree.leaves.findIndex((l) => l === leafHash)
  if (leafIndex === -1) throw new Error('Address not in authorized set')
  const pathIndices: number[] = []
  const siblings: bigint[] = []
  let idx = leafIndex
  for (let i = 0; i < LEVELS; i++) {
    const isLeft = idx % 2 === 0
    pathIndices.push(isLeft ? 0 : 1)
    siblings.push(tree.levels[i][isLeft ? idx + 1 : idx - 1])
    idx = Math.floor(idx / 2)
  }
  return { walletAddress: field, pathIndices, siblings, root: tree.root }
}
