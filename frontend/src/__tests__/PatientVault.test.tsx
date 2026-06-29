import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PatientVault } from '../components/PatientVault'

const DOC = { id: 'doc1', cid: 'cidABC', docType: 'clinical_history', createdAt: 1700000000, doctor: 'GDOC' }
const DOCTOR = 'G' + 'A'.repeat(55)

let mockDocuments: typeof DOC[] = [DOC]
let mockActiveTokens: Array<{
  tokenId: string; documentId: string; doctorAddress: string; expiresAt: number; wrappingKey: string
}> = []

const grantAccess = vi.fn(async (..._a: unknown[]) => 'token123')
const deriveDocumentKey = vi.fn(async () => ({}) as CryptoKey)
const downloadEncryptedPayload = vi.fn(async () => 'payload')
const decodePayload = vi.fn(() => ({ ciphertext: new ArrayBuffer(8), iv: new Uint8Array(12), salt: new Uint8Array(16) }))
const encryptKeyWithWK = vi.fn(async () => new Uint8Array(60))
const saveActiveToken = vi.fn()

vi.mock('@/hooks/useDocuments', () => ({
  useDocuments: () => ({ documents: mockDocuments, loading: false, error: null, reload: vi.fn() }),
}))
vi.mock('@/lib/stellar', () => ({
  getAuditLog: vi.fn(async () => []),
  grantAccess: (...a: unknown[]) => grantAccess(...(a as [])),
  revokeAccess: vi.fn(async () => {}),
}))
vi.mock('@/lib/keystore', () => ({
  deriveDocumentKey: (...a: unknown[]) => deriveDocumentKey(...(a as [])),
}))
vi.mock('@/lib/ipfs', () => ({
  downloadEncryptedPayload: (...a: unknown[]) => downloadEncryptedPayload(...(a as [])),
}))
vi.mock('@/lib/encryption', () => ({
  decodePayload: (...a: unknown[]) => decodePayload(...(a as [])),
  importKey: vi.fn(async () => ({}) as CryptoKey),
}))
vi.mock('@/lib/dockeys', () => ({
  getStoredDocumentKey: () => null,
}))
vi.mock('@/lib/ecies', () => ({
  generateWrappingKey: () => new Uint8Array(32),
  encryptKeyWithWK: (...a: unknown[]) => encryptKeyWithWK(...(a as [])),
  wkToBase64: () => 'wkBase64',
}))
vi.mock('@/lib/tokenstore', () => ({
  saveActiveToken: (...a: unknown[]) => saveActiveToken(...(a as [])),
  getActiveTokens: () => mockActiveTokens,
  removeToken: vi.fn(),
}))
vi.mock('../components/QRGenerator', () => ({
  QRGenerator: ({ tokenId }: { tokenId: string }) => <div>QR-FOR-{tokenId}</div>,
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockDocuments = [DOC]
  mockActiveTokens = []
})

describe('PatientVault grant flow', () => {
  it('lists patient documents', () => {
    render(<PatientVault publicKey="GPATIENT" />)
    expect(screen.getByText('clinical history')).toBeInTheDocument()
  })

  it('shows an empty state when there are no documents', () => {
    mockDocuments = []
    render(<PatientVault publicKey="GPATIENT" />)
    expect(screen.getByText('No documents yet')).toBeInTheDocument()
  })

  it('validates the doctor address before continuing', async () => {
    const user = userEvent.setup()
    render(<PatientVault publicKey="GPATIENT" />)
    await user.click(screen.getByText('clinical history'))
    const input = await screen.findByPlaceholderText('G...')
    await user.type(input, 'GSHORT')
    expect(screen.getByRole('button', { name: /Continue/i })).toBeDisabled()
  })

  it('derives the key from signature and produces a QR on grant', async () => {
    const user = userEvent.setup()
    render(<PatientVault publicKey="GPATIENT" />)

    await user.click(screen.getByText('clinical history'))
    const input = await screen.findByPlaceholderText('G...')
    await user.type(input, DOCTOR)
    await user.click(screen.getByRole('button', { name: /Continue/i }))

    await user.click(await screen.findByRole('button', { name: /24 hours/i }))

    await waitFor(() => expect(screen.getByText('QR-FOR-token123')).toBeInTheDocument())
    expect(downloadEncryptedPayload).toHaveBeenCalledWith('cidABC')
    expect(deriveDocumentKey).toHaveBeenCalledTimes(1)
    expect(grantAccess).toHaveBeenCalledTimes(1)
    expect(grantAccess.mock.calls[0][0]).toBe(DOCTOR)
    expect(grantAccess.mock.calls[0][1]).toBe('doc1')
    expect(saveActiveToken).toHaveBeenCalledTimes(1)
  })

  it('reuses the QR of an already active token without re-signing', async () => {
    mockActiveTokens = [{
      tokenId: 'tokExisting',
      documentId: 'doc1',
      doctorAddress: DOCTOR,
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
      wrappingKey: 'wkBase64',
    }]
    const user = userEvent.setup()
    render(<PatientVault publicKey="GPATIENT" />)

    await user.click(screen.getByText('clinical history'))
    expect(await screen.findByText(/Active accesses \(1\)/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'QR' }))

    expect(await screen.findByText('QR-FOR-tokExisting')).toBeInTheDocument()
    expect(deriveDocumentKey).not.toHaveBeenCalled()
    expect(grantAccess).not.toHaveBeenCalled()
  })
})
