import { describe, it, expect } from 'vitest'
import {
  generateKey,
  encryptFile,
  decryptFile,
  exportKey,
  importKey,
  encodePayload,
  decodePayload,
} from '../lib/encryption'

describe('encryption', () => {
  it('encrypt → decrypt round-trip returns original bytes', async () => {
    const key = await generateKey()
    const original = new TextEncoder().encode('Hello MedVault').buffer as ArrayBuffer
    const { ciphertext, iv } = await encryptFile(original, key)
    const decrypted = await decryptFile(ciphertext, iv, key)
    expect(new Uint8Array(decrypted)).toEqual(new Uint8Array(original))
  })

  it('each encryption produces a different IV', async () => {
    const key = await generateKey()
    const data = new TextEncoder().encode('same data').buffer as ArrayBuffer
    const { iv: iv1 } = await encryptFile(data, key)
    const { iv: iv2 } = await encryptFile(data, key)
    expect(iv1).not.toEqual(iv2)
  })

  it('exportKey / importKey round-trip works', async () => {
    const key = await generateKey()
    const b64 = await exportKey(key)
    const imported = await importKey(b64)
    const data = new TextEncoder().encode('test').buffer as ArrayBuffer
    const { ciphertext, iv } = await encryptFile(data, key)
    const decrypted = await decryptFile(ciphertext, iv, imported)
    expect(new Uint8Array(decrypted)).toEqual(new Uint8Array(data))
  })

  it('wrong key fails to decrypt', async () => {
    const key1 = await generateKey()
    const key2 = await generateKey()
    const data = new TextEncoder().encode('secret').buffer as ArrayBuffer
    const { ciphertext, iv } = await encryptFile(data, key1)
    await expect(decryptFile(ciphertext, iv, key2)).rejects.toThrow()
  })

  it('encodePayload / decodePayload round-trip preserves bytes', async () => {
    const key = await generateKey()
    const data = new TextEncoder().encode('clinical note').buffer as ArrayBuffer
    const { ciphertext, iv } = await encryptFile(data, key)
    const encoded = encodePayload(ciphertext, iv)
    const { ciphertext: ct2, iv: iv2 } = decodePayload(encoded)
    expect(new Uint8Array(ct2)).toEqual(new Uint8Array(ciphertext))
    expect(iv2).toEqual(iv)
  })

  it('encodePayload / decodePayload preserves the salt', async () => {
    const key = await generateKey()
    const data = new TextEncoder().encode('with salt').buffer as ArrayBuffer
    const { ciphertext, iv } = await encryptFile(data, key)
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const encoded = encodePayload(ciphertext, iv, salt)
    const { salt: salt2 } = decodePayload(encoded)
    expect(salt2).toEqual(salt)
  })

  it('decodePayload returns an empty salt when none was encoded', async () => {
    const key = await generateKey()
    const data = new TextEncoder().encode('no salt').buffer as ArrayBuffer
    const { ciphertext, iv } = await encryptFile(data, key)
    const { salt } = decodePayload(encodePayload(ciphertext, iv))
    expect(salt.length).toBe(0)
  })

  it('encrypts a 1MB file correctly', async () => {
    const key = await generateKey()
    const big = new Uint8Array(1024 * 1024).fill(42).buffer as ArrayBuffer
    const { ciphertext, iv } = await encryptFile(big, key)
    const decrypted = await decryptFile(ciphertext, iv, key)
    expect(new Uint8Array(decrypted)).toEqual(new Uint8Array(big))
  }, 20000)

  it('base64 payload round-trip preserves every byte of a 256KB random buffer', async () => {
    const key = await generateKey()
    const random = new Uint8Array(256 * 1024)
    for (let i = 0; i < random.length; i += 65536) {
      crypto.getRandomValues(random.subarray(i, Math.min(i + 65536, random.length)))
    }
    const { ciphertext, iv } = await encryptFile(random.buffer as ArrayBuffer, key)
    const { ciphertext: ct2, iv: iv2 } = decodePayload(encodePayload(ciphertext, iv))
    const decrypted = await decryptFile(ct2, iv2, key)
    const out = new Uint8Array(decrypted)
    expect(out.length).toBe(random.length)
    expect(out).toEqual(random)
  }, 20000)

  it('exportKey produces valid base64', async () => {
    const key = await generateKey()
    const b64 = await exportKey(key)
    expect(() => atob(b64)).not.toThrow()
    expect(atob(b64).length).toBe(32)
  })
})
