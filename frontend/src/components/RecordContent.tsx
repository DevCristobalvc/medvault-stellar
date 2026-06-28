import { useEffect, useMemo } from 'react'
import { Download, FileQuestion } from 'lucide-react'

type Kind = 'image' | 'pdf' | 'text' | 'binary'

function detect(bytes: Uint8Array): { mime: string; kind: Exclude<Kind, 'text'> } {
  const b = (i: number) => bytes[i]
  if (bytes.length >= 3 && b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) {
    return { mime: 'image/jpeg', kind: 'image' }
  }
  if (bytes.length >= 4 && b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) {
    return { mime: 'image/png', kind: 'image' }
  }
  if (bytes.length >= 3 && b(0) === 0x47 && b(1) === 0x49 && b(2) === 0x46) {
    return { mime: 'image/gif', kind: 'image' }
  }
  if (
    bytes.length >= 12 &&
    b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 &&
    b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50
  ) {
    return { mime: 'image/webp', kind: 'image' }
  }
  if (bytes.length >= 4 && b(0) === 0x25 && b(1) === 0x50 && b(2) === 0x44 && b(3) === 0x46) {
    return { mime: 'application/pdf', kind: 'pdf' }
  }
  return { mime: 'application/octet-stream', kind: 'binary' }
}

function tryDecodeText(data: ArrayBuffer): string | null {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(data)
    return text.indexOf(String.fromCharCode(0)) !== -1 ? null : text
  } catch {
    return null
  }
}

interface RecordContentProps {
  data: ArrayBuffer
  docType: string
}

export function RecordContent({ data, docType }: RecordContentProps) {
  const resolved = useMemo(() => {
    const det = detect(new Uint8Array(data))
    if (det.kind === 'binary') {
      const text = tryDecodeText(data)
      if (text !== null) return { kind: 'text' as Kind, mime: 'text/plain', text }
    }
    return { kind: det.kind as Kind, mime: det.mime, text: null as string | null }
  }, [data])

  const url = useMemo(() => {
    if (resolved.kind === 'text') return null
    return URL.createObjectURL(new Blob([data], { type: resolved.mime }))
  }, [data, resolved])

  useEffect(() => {
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [url])

  if (resolved.kind === 'text') {
    return <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{resolved.text}</p>
  }

  if (resolved.kind === 'image' && url) {
    return (
      <img
        src={url}
        alt={docType}
        className="max-w-full h-auto rounded-md border border-border"
      />
    )
  }

  if (resolved.kind === 'pdf' && url) {
    return (
      <div className="flex flex-col gap-2">
        <iframe src={url} title={docType} className="w-full h-[60dvh] rounded-md border border-border" />
        <a
          href={url}
          download="record.pdf"
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline self-start"
        >
          <Download className="h-3.5 w-3.5" /> Download PDF
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2 py-4 text-center">
      <FileQuestion className="h-7 w-7 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">Binary file ({(data.byteLength / 1024).toFixed(0)} KB)</p>
      {url && (
        <a
          href={url}
          download="record.bin"
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <Download className="h-3.5 w-3.5" /> Download file
        </a>
      )}
    </div>
  )
}
