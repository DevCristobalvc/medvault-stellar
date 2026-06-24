import { describe, it, expect, beforeEach } from 'vitest'
import { saveDocumentKey, getDocumentKey } from '../lib/keystore'

beforeEach(() => {
  localStorage.clear()
})

describe('keystore', () => {
  it('saves and retrieves a key by document ID', () => {
    saveDocumentKey('doc-abc', 'base64keyXYZ')
    expect(getDocumentKey('doc-abc')).toBe('base64keyXYZ')
  })

  it('returns null for unknown document ID', () => {
    expect(getDocumentKey('unknown')).toBeNull()
  })

  it('overwrites existing key for same document', () => {
    saveDocumentKey('doc-1', 'oldkey')
    saveDocumentKey('doc-1', 'newkey')
    expect(getDocumentKey('doc-1')).toBe('newkey')
  })

  it('stores multiple documents independently', () => {
    saveDocumentKey('doc-1', 'key1')
    saveDocumentKey('doc-2', 'key2')
    expect(getDocumentKey('doc-1')).toBe('key1')
    expect(getDocumentKey('doc-2')).toBe('key2')
  })
})
