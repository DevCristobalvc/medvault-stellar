export type MediaKind = 'image' | 'pdf' | 'text' | 'binary'

export interface DetectedMedia {
  kind: MediaKind
  mime: string
  text: string | null
}

const CHUNK_SIZE = 0x8000

function decodeText(data: ArrayBuffer): string | null {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(data)
    return text.indexOf(String.fromCharCode(0)) !== -1 ? null : text
  } catch {
    return null
  }
}

function looksLikeSvg(text: string): boolean {
  return text.slice(0, 1000).toLowerCase().includes('<svg')
}

export function detectMedia(data: ArrayBuffer): DetectedMedia {
  const b = new Uint8Array(data)
  const at = (i: number) => b[i]

  if (b.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff)
    return { kind: 'image', mime: 'image/jpeg', text: null }
  if (b.length >= 4 && at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47)
    return { kind: 'image', mime: 'image/png', text: null }
  if (b.length >= 3 && at(0) === 0x47 && at(1) === 0x49 && at(2) === 0x46)
    return { kind: 'image', mime: 'image/gif', text: null }
  if (
    b.length >= 12 &&
    at(0) === 0x52 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x46 &&
    at(8) === 0x57 && at(9) === 0x45 && at(10) === 0x42 && at(11) === 0x50
  )
    return { kind: 'image', mime: 'image/webp', text: null }
  if (b.length >= 4 && at(0) === 0x25 && at(1) === 0x50 && at(2) === 0x44 && at(3) === 0x46)
    return { kind: 'pdf', mime: 'application/pdf', text: null }

  const text = decodeText(data)
  if (text !== null) {
    if (looksLikeSvg(text)) return { kind: 'image', mime: 'image/svg+xml', text: null }
    return { kind: 'text', mime: 'text/plain', text }
  }

  return { kind: 'binary', mime: 'application/octet-stream', text: null }
}

export function extensionForMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg': return 'jpg'
    case 'image/png': return 'png'
    case 'image/gif': return 'gif'
    case 'image/webp': return 'webp'
    case 'image/svg+xml': return 'svg'
    case 'application/pdf': return 'pdf'
    case 'text/plain': return 'txt'
    default: return 'bin'
  }
}

export async function assembleBlobUrl(
  data: ArrayBuffer,
  mime: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<string> {
  const src = new Uint8Array(data)
  const total = src.length
  const out = new Uint8Array(total)

  if (total === 0) onProgress?.(0, 0)
  for (let offset = 0; offset < total; offset += CHUNK_SIZE) {
    const end = Math.min(offset + CHUNK_SIZE, total)
    out.set(src.subarray(offset, end), offset)
    onProgress?.(end, total)
    if (end < total) await new Promise((resolve) => setTimeout(resolve, 0))
  }

  return URL.createObjectURL(new Blob([out], { type: mime }))
}
