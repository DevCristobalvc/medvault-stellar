const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12

const CHUNK_SIZE = 0x8000

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE))
  }
  return btoa(binary)
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: ALGORITHM, length: KEY_LENGTH }, true, [
    'encrypt',
    'decrypt',
  ])
}

export async function encryptFile(
  data: ArrayBuffer,
  key: CryptoKey
): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const ivBuffer = iv.buffer.slice(0) as ArrayBuffer
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: new Uint8Array(ivBuffer) },
    key,
    data
  )
  return { ciphertext, iv: new Uint8Array(ivBuffer) }
}

export async function decryptFile(
  ciphertext: ArrayBuffer,
  iv: Uint8Array,
  key: CryptoKey
): Promise<ArrayBuffer> {
  const ivBuffer = iv.buffer.slice(0) as ArrayBuffer
  return crypto.subtle.decrypt({ name: ALGORITHM, iv: new Uint8Array(ivBuffer) }, key, ciphertext)
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key)
  return bytesToBase64(new Uint8Array(raw))
}

export async function importKey(base64: string): Promise<CryptoKey> {
  const raw = base64ToBytes(base64)
  return crypto.subtle.importKey('raw', raw, { name: ALGORITHM, length: KEY_LENGTH }, true, [
    'encrypt',
    'decrypt',
  ])
}

export function encodePayload(ciphertext: ArrayBuffer, iv: Uint8Array): string {
  const ivB64 = bytesToBase64(iv)
  const ctB64 = bytesToBase64(new Uint8Array(ciphertext))
  return JSON.stringify({ iv: ivB64, ct: ctB64 })
}

export function decodePayload(payload: string): { ciphertext: ArrayBuffer; iv: Uint8Array } {
  const { iv: ivB64, ct: ctB64 } = JSON.parse(payload)
  const iv = base64ToBytes(ivB64)
  const ciphertext = base64ToBytes(ctB64).buffer
  return { ciphertext, iv }
}
