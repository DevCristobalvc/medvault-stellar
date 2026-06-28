const DERIVATION_MESSAGE =
  'MedVault key derivation v1. Sign to unlock your encrypted medical records.'
const SALT_LENGTH = 16
const KEY_INFO = 'medvault-document-key'

let cached: { address: string; secret: ArrayBuffer } | null = null

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
}

export async function deriveKeyFromSecret(
  secret: ArrayBuffer,
  salt: Uint8Array
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(salt),
      info: new Uint8Array(new TextEncoder().encode(KEY_INFO)),
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

async function getMasterSecret(): Promise<ArrayBuffer> {
  const { getKitAddress, signMessageWithWallet } = await import('@/lib/walletKit')
  const address = await getKitAddress()
  if (cached && cached.address === address) return cached.secret
  const signature = await signMessageWithWallet(DERIVATION_MESSAGE)
  const secret = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(signature))
  cached = { address, secret }
  return secret
}

export async function deriveDocumentKey(salt: Uint8Array): Promise<CryptoKey> {
  return deriveKeyFromSecret(await getMasterSecret(), salt)
}

export function clearKeyCache(): void {
  cached = null
}
