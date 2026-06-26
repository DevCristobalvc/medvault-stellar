import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  saveActiveToken,
  getActiveTokens,
  getAllActiveTokens,
  removeToken,
} from '../lib/tokenstore'

const NOW = 1000000

beforeEach(() => {
  localStorage.clear()
  vi.setSystemTime(NOW * 1000)
})

const makeToken = (overrides: Partial<Parameters<typeof saveActiveToken>[0]> = {}) => ({
  tokenId: 'tok-1',
  documentId: 'doc-1',
  doctorAddress: 'GDOCTOR1',
  expiresAt: NOW + 3600,
  ...overrides,
})

describe('tokenstore', () => {
  it('saves and retrieves an active token', () => {
    saveActiveToken(makeToken())
    const tokens = getActiveTokens('doc-1')
    expect(tokens).toHaveLength(1)
    expect(tokens[0].tokenId).toBe('tok-1')
  })

  it('filters out expired tokens', () => {
    saveActiveToken(makeToken({ tokenId: 'expired', expiresAt: NOW - 1 }))
    saveActiveToken(makeToken({ tokenId: 'valid', expiresAt: NOW + 3600 }))
    const tokens = getActiveTokens('doc-1')
    expect(tokens).toHaveLength(1)
    expect(tokens[0].tokenId).toBe('valid')
  })

  it('filters by document ID', () => {
    saveActiveToken(makeToken({ tokenId: 'tok-1', documentId: 'doc-1' }))
    saveActiveToken(makeToken({ tokenId: 'tok-2', documentId: 'doc-2' }))
    expect(getActiveTokens('doc-1')).toHaveLength(1)
    expect(getActiveTokens('doc-2')).toHaveLength(1)
    expect(getActiveTokens('doc-1')[0].tokenId).toBe('tok-1')
  })

  it('removes a token by ID', () => {
    saveActiveToken(makeToken({ tokenId: 'tok-a' }))
    saveActiveToken(makeToken({ tokenId: 'tok-b' }))
    removeToken('tok-a')
    const tokens = getActiveTokens('doc-1')
    expect(tokens).toHaveLength(1)
    expect(tokens[0].tokenId).toBe('tok-b')
  })

  it('getAllActiveTokens returns across all documents', () => {
    saveActiveToken(makeToken({ tokenId: 'tok-1', documentId: 'doc-1' }))
    saveActiveToken(makeToken({ tokenId: 'tok-2', documentId: 'doc-2' }))
    expect(getAllActiveTokens()).toHaveLength(2)
  })

  it('stores grantedAt timestamp automatically', () => {
    saveActiveToken(makeToken())
    const [token] = getActiveTokens('doc-1')
    expect(token.grantedAt).toBe(NOW)
  })

  it('persists the wrapping key for QR regeneration', () => {
    saveActiveToken(makeToken({ wrappingKey: 'wk-base64' }))
    const [token] = getActiveTokens('doc-1')
    expect(token.wrappingKey).toBe('wk-base64')
  })

  it('multiple doctors on same document', () => {
    saveActiveToken(makeToken({ tokenId: 'tok-1', doctorAddress: 'GDOC1' }))
    saveActiveToken(makeToken({ tokenId: 'tok-2', doctorAddress: 'GDOC2' }))
    const tokens = getActiveTokens('doc-1')
    expect(tokens).toHaveLength(2)
    expect(tokens.map(t => t.doctorAddress)).toContain('GDOC1')
    expect(tokens.map(t => t.doctorAddress)).toContain('GDOC2')
  })
})
