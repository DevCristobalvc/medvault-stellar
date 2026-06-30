import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DocumentUpload } from '../components/DocumentUpload'

const generateKey = vi.fn(async () => ({}) as CryptoKey)
const exportKey = vi.fn(async () => 'keyB64')
const encryptFile = vi.fn(async () => ({ ciphertext: new ArrayBuffer(8), iv: new Uint8Array(12) }))
const encodePayload = vi.fn(() => 'payload')
const uploadEncryptedPayload = vi.fn(async () => 'cid123')
const registerDocument = vi.fn(async () => 'doc123')
const saveDocumentKey = vi.fn()

vi.mock('@/lib/encryption', () => ({
  generateKey: (...a: unknown[]) => generateKey(...(a as [])),
  exportKey: (...a: unknown[]) => exportKey(...(a as [])),
  encryptFile: (...a: unknown[]) => encryptFile(...(a as [])),
  encodePayload: (...a: unknown[]) => encodePayload(...(a as [])),
}))
vi.mock('@/lib/dockeys', () => ({
  saveDocumentKey: (...a: unknown[]) => saveDocumentKey(...(a as [])),
}))
vi.mock('@/lib/ipfs', () => ({
  uploadEncryptedPayload: (...a: unknown[]) => uploadEncryptedPayload(...(a as [])),
}))
vi.mock('@/lib/stellar', () => ({
  registerDocument: (...a: unknown[]) => registerDocument(...(a as [])),
}))

const PATIENT = 'GA3FTC5BABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJ3VUZ'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('DocumentUpload', () => {
  it('blocks submit without a patient address', async () => {
    const user = userEvent.setup()
    render(<DocumentUpload lang="en" />)
    await user.click(screen.getByRole('button', { name: /Encrypt & Upload/i }))
    expect(screen.getByText(/Enter the patient Stellar address/i)).toBeInTheDocument()
    expect(registerDocument).not.toHaveBeenCalled()
  })

  it('blocks submit with empty clinical content', async () => {
    const user = userEvent.setup()
    render(<DocumentUpload lang="en" />)
    await user.type(screen.getByPlaceholderText('G...'), PATIENT)
    await user.click(screen.getByRole('button', { name: /Encrypt & Upload/i }))
    expect(screen.getByText(/Write the clinical content/i)).toBeInTheDocument()
    expect(registerDocument).not.toHaveBeenCalled()
  })

  it('runs encrypt → upload → register on a valid submit', async () => {
    const user = userEvent.setup()
    render(<DocumentUpload lang="en" />)
    await user.type(screen.getByPlaceholderText('G...'), PATIENT)
    await user.type(screen.getByPlaceholderText(/Write the clinical record/i), 'Blood test normal')
    await user.click(screen.getByRole('button', { name: /Encrypt & Upload/i }))

    await waitFor(() => expect(screen.getByText(/Document registered on Stellar/i)).toBeInTheDocument())
    expect(generateKey).toHaveBeenCalledTimes(1)
    expect(uploadEncryptedPayload).toHaveBeenCalledTimes(1)
    expect(saveDocumentKey).toHaveBeenCalledWith('cid123', 'keyB64')
    expect(registerDocument).toHaveBeenCalledWith(PATIENT, 'cid123', 'clinical_history')
  })

  it('derives docType from the file name when uploading a file', async () => {
    const user = userEvent.setup()
    const { container } = render(<DocumentUpload lang="en" />)
    await user.type(screen.getByPlaceholderText('G...'), PATIENT)
    await user.click(screen.getByRole('button', { name: /Upload file/i }))

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['x-ray'], 'chest-xray.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: /Encrypt & Upload/i }))

    await waitFor(() => expect(screen.getByText(/Document registered on Stellar/i)).toBeInTheDocument())
    expect(registerDocument).toHaveBeenCalledWith(PATIENT, 'cid123', 'chest-xray')
  })

  it('keeps a manually entered docType when a file is selected', async () => {
    const user = userEvent.setup()
    const { container } = render(<DocumentUpload lang="en" />)
    await user.type(screen.getByPlaceholderText('G...'), PATIENT)

    const docTypeInput = screen.getByPlaceholderText('clinical_history')
    await user.clear(docTypeInput)
    await user.type(docTypeInput, 'radiology')

    await user.click(screen.getByRole('button', { name: /Upload file/i }))
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, new File(['scan'], 'scan.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: /Encrypt & Upload/i }))

    await waitFor(() => expect(screen.getByText(/Document registered on Stellar/i)).toBeInTheDocument())
    expect(registerDocument).toHaveBeenCalledWith(PATIENT, 'cid123', 'radiology')
  })
})
