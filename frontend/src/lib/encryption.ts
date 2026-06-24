const ALGORITHM = 'AES-GCM'
const KEY_LENGTH = 256
const IV_LENGTH = 12

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
  return btoa(String.fromCharCode(...new Uint8Array(raw)))
}

export async function importKey(base64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  return crypto.subtle.importKey('raw', raw, { name: ALGORITHM, length: KEY_LENGTH }, true, [
    'encrypt',
    'decrypt',
  ])
}

export function encodePayload(ciphertext: ArrayBuffer, iv: Uint8Array): string {
  const ivB64 = btoa(String.fromCharCode(...iv))
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
  return JSON.stringify({ iv: ivB64, ct: ctB64 })
}

export function decodePayload(payload: string): { ciphertext: ArrayBuffer; iv: Uint8Array } {
  const { iv: ivB64, ct: ctB64 } = JSON.parse(payload)
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0))
  const ciphertext = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0)).buffer
  return { ciphertext, iv }
}
