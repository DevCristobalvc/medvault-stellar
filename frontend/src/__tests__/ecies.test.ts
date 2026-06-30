import { describe, it, expect } from 'vitest'
import { x25519 } from '@noble/curves/ed25519.js'
import { wrapAesKey, unwrapAesKey } from '../lib/ecies'
import { generateKey } from '../lib/encryption'

function recipient() {
  const priv = x25519.utils.randomSecretKey()
  const pub = x25519.getPublicKey(priv)
  return { priv, pub }
}

describe('ecies (X25519 ECDH + HKDF + AES-GCM)', () => {
  it('wrapAesKey → unwrapAesKey round-trip', async () => {
    const aesKey = await generateKey()
    const { priv, pub } = recipient()

    const blob = await wrapAesKey(aesKey, pub)
    const recovered = await unwrapAesKey(blob, priv)

    const raw1 = await crypto.subtle.exportKey('raw', aesKey)
    const raw2 = await crypto.subtle.exportKey('raw', recovered)
    expect(new Uint8Array(raw1)).toEqual(new Uint8Array(raw2))
  })

  it('blob starts with version byte 0x03', async () => {
    const aesKey = await generateKey()
    const { pub } = recipient()
    const blob = await wrapAesKey(aesKey, pub)
    expect(blob[0]).toBe(0x03)
  })

  it('blob is 93 bytes (1 version + 32 ephPub + 12 iv + 48 ciphertext)', async () => {
    const aesKey = await generateKey()
    const { pub } = recipient()
    const blob = await wrapAesKey(aesKey, pub)
    expect(blob.byteLength).toBe(93)
  })

  it('two wraps of the same key produce different blobs (ephemeral key)', async () => {
    const aesKey = await generateKey()
    const { pub } = recipient()
    const a = await wrapAesKey(aesKey, pub)
    const b = await wrapAesKey(aesKey, pub)
    expect(a).not.toEqual(b)
  })

  it('wrong private key fails to unwrap', async () => {
    const aesKey = await generateKey()
    const { pub } = recipient()
    const other = recipient()
    const blob = await wrapAesKey(aesKey, pub)
    await expect(unwrapAesKey(blob, other.priv)).rejects.toThrow()
  })

  it('rejects an unknown version byte', async () => {
    const aesKey = await generateKey()
    const { priv, pub } = recipient()
    const blob = await wrapAesKey(aesKey, pub)
    blob[0] = 0x02
    await expect(unwrapAesKey(blob, priv)).rejects.toThrow(/Unsupported/)
  })
})
