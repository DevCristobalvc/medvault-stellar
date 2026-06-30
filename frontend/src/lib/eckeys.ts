import { x25519 } from '@noble/curves/ed25519.js'
import { sha512 } from '@noble/hashes/sha2.js'

const STORE_KEY = 'medvault_ec_keys'
const DERIVATION_MESSAGE =
  'MedVault encryption key derivation v1. Sign to create your private decryption key.'

export interface Keypair {
  priv: Uint8Array
  pub: Uint8Array
}

type StoredEntry = { priv: string; pub: string }

function bytesToB64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function b64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

function load(): Record<string, StoredEntry> {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function getStoredKeypair(address: string): Keypair | null {
  const entry = load()[address]
  if (!entry) return null
  return { priv: b64ToBytes(entry.priv), pub: b64ToBytes(entry.pub) }
}

function persist(address: string, keypair: Keypair): void {
  const store = load()
  store[address] = { priv: bytesToB64(keypair.priv), pub: bytesToB64(keypair.pub) }
  localStorage.setItem(STORE_KEY, JSON.stringify(store))
}

export async function ensureKeypair(address: string): Promise<Keypair> {
  const existing = getStoredKeypair(address)
  if (existing) return existing

  const { signMessageWithWallet } = await import('@/lib/walletKit')
  const signature = await signMessageWithWallet(DERIVATION_MESSAGE)
  const seed = sha512(new TextEncoder().encode(signature)).slice(0, 32)
  const pub = x25519.getPublicKey(seed)
  const keypair: Keypair = { priv: seed, pub }
  persist(address, keypair)
  return keypair
}

export function pubToHex(pub: Uint8Array): string {
  return Array.from(pub)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
