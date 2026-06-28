import { PinataSDK } from 'pinata'

function getClient(): PinataSDK {
  return new PinataSDK({
    pinataJwt: import.meta.env.VITE_PINATA_JWT,
    pinataGateway: import.meta.env.VITE_PINATA_GATEWAY?.trim() || 'gateway.pinata.cloud',
  })
}

const UPLOAD_TIMEOUT_MS = 60_000

function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ])
}

export async function uploadEncryptedPayload(
  payload: string,
  metadata: { docType: string; patientAddress: string }
): Promise<string> {
  if (!import.meta.env.VITE_PINATA_JWT) {
    throw new Error('IPFS is not configured (missing VITE_PINATA_JWT).')
  }

  const pinata = getClient()
  const blob = new Blob([payload], { type: 'application/octet-stream' })
  const file = new File([blob], 'record.enc', { type: 'application/octet-stream' })

  const result = await withTimeout(
    pinata.upload.public
      .file(file)
      .name(`medvault-${metadata.patientAddress.slice(0, 8)}-${Date.now()}`)
      .keyvalues({ docType: metadata.docType, patient: metadata.patientAddress }),
    UPLOAD_TIMEOUT_MS,
    'IPFS upload'
  )

  return result.cid
}

export async function downloadEncryptedPayload(cid: string): Promise<string> {
  const gateway = import.meta.env.VITE_PINATA_GATEWAY?.trim() || 'gateway.pinata.cloud'
  const res = await fetch(`https://${gateway}/ipfs/${cid}`)
  if (!res.ok) throw new Error(`IPFS gateway error: ${res.status}`)
  return res.text()
}
