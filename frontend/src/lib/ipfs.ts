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

  const result = await pinata.upload.public
    .file(file)
    .name(`medvault-${metadata.patientAddress.slice(0, 8)}-${Date.now()}`)
    .keyvalues({ docType: metadata.docType, patient: metadata.patientAddress })

  return result.cid
}

export async function downloadEncryptedPayload(cid: string): Promise<string> {
  const gateway = import.meta.env.VITE_PINATA_GATEWAY ?? 'gateway.pinata.cloud'
  const res = await fetch(`https://${gateway}/ipfs/${cid}`)
  if (!res.ok) throw new Error(`IPFS gateway error: ${res.status}`)
  return res.text()
}
