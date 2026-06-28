const UPLOAD_TIMEOUT_MS = 60_000

export async function uploadEncryptedPayload(
  payload: string,
  metadata: { docType: string; patientAddress: string }
): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        payload,
        docType: metadata.docType,
        patientAddress: metadata.patientAddress,
      }),
      signal: controller.signal,
    })
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('IPFS upload timed out after 60s')
    }
    throw e
  } finally {
    clearTimeout(timer)
  }

  if (!res.ok) {
    let message = `IPFS upload failed (${res.status})`
    try {
      const data = await res.json()
      if (data?.error) message = data.error
    } catch {
      message = `IPFS upload failed (${res.status})`
    }
    throw new Error(message)
  }

  const { cid } = (await res.json()) as { cid?: string }
  if (!cid) throw new Error('IPFS upload returned no CID')
  return cid
}

export async function downloadEncryptedPayload(cid: string): Promise<string> {
  const gateway = import.meta.env.VITE_PINATA_GATEWAY?.trim() || 'gateway.pinata.cloud'
  const res = await fetch(`https://${gateway}/ipfs/${cid}`)
  if (!res.ok) throw new Error(`IPFS gateway error: ${res.status}`)
  return res.text()
}
