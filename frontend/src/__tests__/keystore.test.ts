import { describe, it, expect } from 'vitest'
import { deriveKeyFromSecret, generateSalt } from '../lib/keystore'
import { encryptFile, decryptFile } from '../lib/encryption'

const secret = new TextEncoder().encode('deterministic-wallet-signature').buffer as ArrayBuffer

describe('keystore key derivation', () => {
  it('same secret and salt derive an identical, working key', async () => {
    const salt = generateSalt()
    const k1 = await deriveKeyFromSecret(secret, salt)
    const k2 = await deriveKeyFromSecret(secret, salt)
    const data = new TextEncoder().encode('clinical record').buffer as ArrayBuffer
    const { ciphertext, iv } = await encryptFile(data, k1)
    const decrypted = await decryptFile(ciphertext, iv, k2)
    expect(new Uint8Array(decrypted)).toEqual(new Uint8Array(data))
  })

  it('different salts derive different keys', async () => {
    const data = new TextEncoder().encode('secret note').buffer as ArrayBuffer
    const k1 = await deriveKeyFromSecret(secret, generateSalt())
    const { ciphertext, iv } = await encryptFile(data, k1)
    const k2 = await deriveKeyFromSecret(secret, generateSalt())
    await expect(decryptFile(ciphertext, iv, k2)).rejects.toThrow()
  })

  it('different secrets derive different keys for the same salt', async () => {
    const salt = generateSalt()
    const data = new TextEncoder().encode('private data').buffer as ArrayBuffer
    const k1 = await deriveKeyFromSecret(secret, salt)
    const other = new TextEncoder().encode('another-signature').buffer as ArrayBuffer
    const k2 = await deriveKeyFromSecret(other, salt)
    const { ciphertext, iv } = await encryptFile(data, k1)
    await expect(decryptFile(ciphertext, iv, k2)).rejects.toThrow()
  })

  it('generateSalt returns 16 random bytes', () => {
    const a = generateSalt()
    const b = generateSalt()
    expect(a.length).toBe(16)
    expect(a).not.toEqual(b)
  })
})
