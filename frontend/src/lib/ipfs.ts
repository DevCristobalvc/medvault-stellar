import { PinataSDK } from 'pinata'

function getClient(): PinataSDK {
  return new PinataSDK({
    pinataJwt: import.meta.env.VITE_PINATA_JWT,
    pinataGateway: import.meta.env.VITE_PINATA_GATEWAY ?? 'gateway.pinata.cloud',
  })
}

export async function uploadEncryptedPayload(
  payload: string,
  metadata: { docType: string; patientAddress: string }
): Promise<string> {
  const pinata = getClient()
  const blob = new Blob([payload], { type: 'application/octet-stream' })
  const file = new File([blob], 'record.enc', { type: 'application/octet-stream' })

  const result = await pinata.upload.public.file(file).addMetadata({
    name: `medvault-${metadata.patientAddress.slice(0, 8)}-${Date.now()}`,
    keyValues: {
      docType: metadata.docType,
      patient: metadata.patientAddress,
    },
  })

  return result.cid
}

export async function downloadEncryptedPayload(cid: string): Promise<string> {
  const pinata = getClient()
  const response = await pinata.gateways.public.get(cid)
  if (typeof response.data === 'string') return response.data
  if (response.data instanceof Blob) return response.data.text()
  throw new Error('Unexpected IPFS response type')
}
