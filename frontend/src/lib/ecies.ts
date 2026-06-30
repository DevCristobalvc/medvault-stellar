import { x25519 } from '@noble/curves/ed25519.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'

const VERSION = 0x03
const PUB_LENGTH = 32
const IV_LENGTH = 12
const HKDF_INFO = new TextEncoder().encode('medvault-ecies-v3')

function deriveSharedKey(shared: Uint8Array, ephPub: Uint8Array): Uint8Array {
  return hkdf(sha256, shared, ephPub, HKDF_INFO, 32)
}

async function aesGcmEncrypt(key: Uint8Array, plaintext: Uint8Array): Promise<{ iv: Uint8Array; ct: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const cryptoKey = await crypto.subtle.importKey('raw', new Uint8Array(key), 'AES-GCM', false, ['encrypt'])
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, new Uint8Array(plaintext))
  return { iv, ct: new Uint8Array(ct) }
}

async function aesGcmDecrypt(key: Uint8Array, iv: Uint8Array, ct: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', new Uint8Array(key), 'AES-GCM', false, ['decrypt'])
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv) }, cryptoKey, new Uint8Array(ct))
  return new Uint8Array(pt)
}

export async function wrapAesKey(aesKey: CryptoKey, recipientPub: Uint8Array): Promise<Uint8Array> {
  const rawKey = new Uint8Array(await crypto.subtle.exportKey('raw', aesKey))
  const ephPriv = x25519.utils.randomSecretKey()
  const ephPub = x25519.getPublicKey(ephPriv)
  const shared = x25519.getSharedSecret(ephPriv, recipientPub)
  const derived = deriveSharedKey(shared, ephPub)
  const { iv, ct } = await aesGcmEncrypt(derived, rawKey)

  const blob = new Uint8Array(1 + PUB_LENGTH + IV_LENGTH + ct.length)
  blob[0] = VERSION
  blob.set(ephPub, 1)
  blob.set(iv, 1 + PUB_LENGTH)
  blob.set(ct, 1 + PUB_LENGTH + IV_LENGTH)
  return blob
}

export async function unwrapAesKey(blob: Uint8Array, recipientPriv: Uint8Array): Promise<CryptoKey> {
  if (blob.length < 1 + PUB_LENGTH + IV_LENGTH || blob[0] !== VERSION) {
    throw new Error('Unsupported encrypted key format')
  }
  const ephPub = blob.slice(1, 1 + PUB_LENGTH)
  const iv = blob.slice(1 + PUB_LENGTH, 1 + PUB_LENGTH + IV_LENGTH)
  const ct = blob.slice(1 + PUB_LENGTH + IV_LENGTH)
  const shared = x25519.getSharedSecret(recipientPriv, ephPub)
  const derived = deriveSharedKey(shared, ephPub)
  const rawKey = await aesGcmDecrypt(derived, iv, ct)
  return crypto.subtle.importKey('raw', new Uint8Array(rawKey), { name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ])
}
