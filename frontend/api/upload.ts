/// <reference types="node" />
import { PinataSDK } from 'pinata'

interface UploadBody {
  payload?: unknown
  docType?: unknown
  patientAddress?: unknown
}

export async function POST(request: Request): Promise<Response> {
  const jwt = process.env.PINATA_JWT
  if (!jwt) {
    return Response.json({ error: 'IPFS is not configured on the server.' }, { status: 500 })
  }

  let body: UploadBody
  try {
    body = (await request.json()) as UploadBody
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { payload, docType, patientAddress } = body
  if (typeof payload !== 'string' || payload.length === 0) {
    return Response.json({ error: 'Missing payload' }, { status: 400 })
  }
  if (typeof patientAddress !== 'string' || patientAddress.length === 0) {
    return Response.json({ error: 'Missing patientAddress' }, { status: 400 })
  }

  try {
    const pinata = new PinataSDK({
      pinataJwt: jwt,
      pinataGateway: process.env.VITE_PINATA_GATEWAY?.trim() || 'gateway.pinata.cloud',
    })

    const file = new File([payload], 'record.enc', { type: 'application/octet-stream' })
    const result = await pinata.upload.public
      .file(file)
      .name(`medvault-${patientAddress.slice(0, 8)}-${Date.now()}`)
      .keyvalues({ docType: typeof docType === 'string' ? docType : '', patient: patientAddress })

    return Response.json({ cid: result.cid }, { status: 200 })
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Upload failed' },
      { status: 502 }
    )
  }
}
