import { describe, it, expect } from 'vitest'
import {
  generateWrappingKey,
  encryptKeyWithWK,
  decryptKeyWithWK,
  wkToBase64,
  base64ToWk,
} from '../lib/ecies'
import { generateKey } from '../lib/encryption'

describe('ecies (wrapping key KEM)', () => {
  it('generates 32-byte wrapping key', () => {
    const wk = generateWrappingKey()
    expect(wk).toHaveLength(32)
  })

  it('two wrapping keys are different', () => {
    const wk1 = generateWrappingKey()
    const wk2 = generateWrappingKey()
    expect(wk1).not.toEqual(wk2)
  })

  it('encryptKeyWithWK → decryptKeyWithWK round-trip', async () => {
    const aesKey = await generateKey()
    const wk = generateWrappingKey()

    const encrypted = await encryptKeyWithWK(aesKey, wk)
    const recovered = await decryptKeyWithWK(encrypted, wk)

    const raw1 = await crypto.subtle.exportKey('raw', aesKey)
    const raw2 = await crypto.subtle.exportKey('raw', recovered)
    expect(new Uint8Array(raw1)).toEqual(new Uint8Array(raw2))
  })

  it('encrypted payload is 60 bytes (12 IV + 48 ciphertext)', async () => {
    const aesKey = await generateKey()
    const wk = generateWrappingKey()
    const encrypted = await encryptKeyWithWK(aesKey, wk)
    expect(encrypted.byteLength).toBe(60)
  })

  it('wrong wrapping key fails decryption', async () => {
    const aesKey = await generateKey()
    const wk = generateWrappingKey()
    const wrongWk = generateWrappingKey()

    const encrypted = await encryptKeyWithWK(aesKey, wk)
    await expect(decryptKeyWithWK(encrypted, wrongWk)).rejects.toThrow()
  })

  it('wkToBase64 / base64ToWk round-trip', () => {
    const wk = generateWrappingKey()
    const b64 = wkToBase64(wk)
    const recovered = base64ToWk(b64)
    expect(recovered).toEqual(wk)
  })

  it('base64 of 32 bytes is 44 chars', () => {
    const wk = generateWrappingKey()
    const b64 = wkToBase64(wk)
    expect(b64.length).toBe(44)
  })
})
