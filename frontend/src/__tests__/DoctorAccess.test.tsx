import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DoctorAccess } from '../components/DoctorAccess'

const DOCTOR = 'G' + 'D'.repeat(55)
const OTHER = 'G' + 'X'.repeat(55)
const PATIENT = 'G' + 'P'.repeat(55)

const getTokenInfo = vi.fn()
const verifyAccess = vi.fn()
const getDocument = vi.fn()
const getEncryptedKey = vi.fn()
const logAccess = vi.fn(async () => {})
const downloadEncryptedPayload = vi.fn(async () => 'payload')
const decodePayload = vi.fn(() => ({ ciphertext: new ArrayBuffer(8), iv: new Uint8Array(12), salt: new Uint8Array(0) }))
const decryptFile = vi.fn(async () => new TextEncoder().encode('Patient stable').buffer as ArrayBuffer)
const unwrapAesKey = vi.fn(async () => ({}) as CryptoKey)
const loadPrivateKey = vi.fn(async () => new Uint8Array(32))
const saveDoctorRecord = vi.fn()

vi.mock('@/lib/stellar', () => ({
  getTokenInfo: (...a: unknown[]) => getTokenInfo(...(a as [])),
  verifyAccess: (...a: unknown[]) => verifyAccess(...(a as [])),
  getDocument: (...a: unknown[]) => getDocument(...(a as [])),
  getEncryptedKey: (...a: unknown[]) => getEncryptedKey(...(a as [])),
  logAccess: (...a: unknown[]) => logAccess(...(a as [])),
  isTransientError: () => false,
}))
vi.mock('@/lib/ipfs', () => ({
  downloadEncryptedPayload: (...a: unknown[]) => downloadEncryptedPayload(...(a as [])),
}))
vi.mock('@/lib/encryption', () => ({
  decodePayload: (...a: unknown[]) => decodePayload(...(a as [])),
  decryptFile: (...a: unknown[]) => decryptFile(...(a as [])),
}))
vi.mock('@/lib/ecies', () => ({
  unwrapAesKey: (...a: unknown[]) => unwrapAesKey(...(a as [])),
}))
vi.mock('@/lib/doctorkey', () => ({
  loadPrivateKey: (...a: unknown[]) => loadPrivateKey(...(a as [])),
}))
vi.mock('@/lib/doctorstore', () => ({
  saveDoctorRecord: (...a: unknown[]) => saveDoctorRecord(...(a as [])),
}))

const VALID_DOC = { cid: 'cid1', docType: 'clinical_history', createdAt: 1700000000 }

beforeEach(() => {
  vi.clearAllMocks()
  getEncryptedKey.mockResolvedValue(new Uint8Array(93))
  getDocument.mockResolvedValue(VALID_DOC)
})

describe('DoctorAccess', () => {
  it('denies access when the token does not exist', async () => {
    getTokenInfo.mockResolvedValue(null)
    render(<DoctorAccess tokenId="t1" doctorPublicKey={DOCTOR} lang="en" />)
    expect(await screen.findByText('Access denied')).toBeInTheDocument()
    expect(screen.getByText(/not found or expired/i)).toBeInTheDocument()
  })

  it('denies access when the token belongs to another wallet', async () => {
    getTokenInfo.mockResolvedValue({ documentId: 'doc1', patient: PATIENT, doctor: OTHER })
    render(<DoctorAccess tokenId="t1" doctorPublicKey={DOCTOR} lang="en" />)
    expect(await screen.findByText('Access denied')).toBeInTheDocument()
    expect(verifyAccess).not.toHaveBeenCalled()
  })

  it('auto-decrypts with the doctor private key when access is valid', async () => {
    getTokenInfo.mockResolvedValue({ documentId: 'doc1', patient: PATIENT, doctor: DOCTOR })
    verifyAccess.mockResolvedValue(true)
    render(<DoctorAccess tokenId="t1" doctorPublicKey={DOCTOR} lang="en" />)

    expect(await screen.findByText('Patient stable')).toBeInTheDocument()
    expect(loadPrivateKey).toHaveBeenCalledWith(DOCTOR)
    expect(unwrapAesKey).toHaveBeenCalledTimes(1)
    expect(logAccess).toHaveBeenCalledWith('t1', PATIENT)
    expect(saveDoctorRecord).toHaveBeenCalledTimes(1)
  })

  it('shows an error with retry when decryption fails', async () => {
    getTokenInfo.mockResolvedValue({ documentId: 'doc1', patient: PATIENT, doctor: DOCTOR })
    verifyAccess.mockResolvedValue(true)
    getDocument.mockRejectedValue(new Error('Document not found on-chain'))
    render(<DoctorAccess tokenId="t1" doctorPublicKey={DOCTOR} lang="en" />)

    expect(await screen.findByText('Access denied')).toBeInTheDocument()
    expect(screen.getByText(/Document not found on-chain/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument()
  })
})
