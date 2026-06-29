const ALGO = 'AES-GCM'
const WK_LENGTH = 32
const IV_LENGTH = 12

export function generateWrappingKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(WK_LENGTH))
}

export async function encryptKeyWithWK(
  aesKey: CryptoKey,
  wk: Uint8Array
): Promise<Uint8Array> {
  const rawKey = await crypto.subtle.exportKey('raw', aesKey)
  const ivRaw = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const iv = ivRaw.buffer.slice(0) as ArrayBuffer
  const wkBuf = wk.buffer.slice(0) as ArrayBuffer
  const wkCrypto = await crypto.subtle.importKey(
    'raw', wkBuf, { name: ALGO, length: WK_LENGTH * 8 }, false, ['encrypt']
  )
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGO, iv: new Uint8Array(iv) }, wkCrypto, rawKey
  )
  const result = new Uint8Array(IV_LENGTH + ciphertext.byteLength)
  result.set(new Uint8Array(iv), 0)
  result.set(new Uint8Array(ciphertext), IV_LENGTH)
  return result
}

export async function decryptKeyWithWK(
  encryptedPayload: Uint8Array,
  wk: Uint8Array
): Promise<CryptoKey> {
  const iv = encryptedPayload.slice(0, IV_LENGTH).buffer.slice(0) as ArrayBuffer
  const ciphertext = encryptedPayload.slice(IV_LENGTH).buffer.slice(0) as ArrayBuffer
  const wkBuf = wk.buffer.slice(0) as ArrayBuffer
  const wkCrypto = await crypto.subtle.importKey(
    'raw', wkBuf, { name: ALGO, length: WK_LENGTH * 8 }, false, ['decrypt']
  )
  const rawKey = await crypto.subtle.decrypt(
    { name: ALGO, iv: new Uint8Array(iv) }, wkCrypto, ciphertext
  )
  return crypto.subtle.importKey(
    'raw', rawKey, { name: ALGO, length: 256 }, true, ['encrypt', 'decrypt']
  )
}

export function wkToBase64(wk: Uint8Array): string {
  return btoa(String.fromCharCode(...wk))
}

export function base64ToWk(b64: string): Uint8Array {
  const clean = b64.trim()
  let raw: string
  try {
    raw = atob(clean)
  } catch {
    throw new Error('Invalid key format. Copy the key again from the patient.')
  }
  if (raw.length !== WK_LENGTH) {
    throw new Error('Invalid key length. Copy the key again from the patient.')
  }
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}
