import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, FileQuestion, Image as ImageIcon, FileText, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { detectMedia, extensionForMime, assembleBlobUrl } from '@/lib/media'

const RENDER_TIMEOUT_MS = 10_000

type Phase = 'idle' | 'loading' | 'rendering' | 'ready' | 'failed'

interface RecordContentProps {
  data: ArrayBuffer
  docType: string
}

export function RecordContent({ data, docType }: RecordContentProps) {
  const media = useMemo(() => detectMedia(data), [data])
  const downloadUrl = useMemo(
    () => URL.createObjectURL(new Blob([data], { type: media.mime })),
    [data, media.mime]
  )
  useEffect(() => () => URL.revokeObjectURL(downloadUrl), [downloadUrl])

  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const previewRef = useRef<string | null>(null)

  useEffect(() => {
    return () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current) }
  }, [])

  useEffect(() => {
    if (phase !== 'rendering') return
    const timer = setTimeout(() => setPhase('failed'), RENDER_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [phase])

  const sizeKb = (data.byteLength / 1024).toFixed(0)
  const filename = `record.${extensionForMime(media.mime)}`

  function downloadLink(label: string) {
    return (
      <a
        href={downloadUrl}
        download={filename}
        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline self-start"
      >
        <Download className="h-3.5 w-3.5" /> {label}
      </a>
    )
  }

  if (media.kind === 'text') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{media.text}</p>
        {downloadLink('Download')}
      </div>
    )
  }

  async function handleLoad() {
    setPhase('loading')
    setProgress(0)
    try {
      const objUrl = await assembleBlobUrl(data, media.mime, (loaded, total) => {
        setProgress(total === 0 ? 100 : Math.round((loaded / total) * 100))
      })
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
      previewRef.current = objUrl
      setPreviewUrl(objUrl)
      setPhase(media.kind === 'image' ? 'rendering' : 'ready')
    } catch {
      setPhase('failed')
    }
  }

  const loadLabel = media.kind === 'image' ? 'Load image' : media.kind === 'pdf' ? 'Load PDF' : 'Load file'

  if (phase === 'idle') {
    const Icon = media.kind === 'image' ? ImageIcon : media.kind === 'pdf' ? FileText : FileQuestion
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <div className="rounded-full bg-muted/40 p-3">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground">
          {media.kind === 'image' ? 'Image' : media.kind === 'pdf' ? 'PDF document' : 'File'} · {sizeKb} KB
        </p>
        <div className="flex items-center gap-4">
          <Button size="sm" onClick={handleLoad}>{loadLabel}</Button>
          {downloadLink('Download')}
        </div>
      </div>
    )
  }

  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground">
          {media.kind === 'image' ? 'Loading image' : 'Loading file'}… {progress}%
        </p>
        <div className="w-full max-w-xs h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-150"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        {downloadLink('Download')}
      </div>
    )
  }

  if (phase === 'failed') {
    return (
      <div className="flex flex-col items-center gap-3 py-5 text-center">
        <div className="rounded-full bg-amber-50 border border-amber-100 p-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
        </div>
        <p className="text-xs text-muted-foreground max-w-xs">
          Couldn&apos;t display this {media.kind === 'image' ? 'image' : 'file'} here. You can download it instead.
        </p>
        {downloadLink(`Download ${media.kind === 'image' ? 'image' : 'file'}`)}
      </div>
    )
  }

  if (media.kind === 'image' && previewUrl) {
    return (
      <div className="flex flex-col gap-2">
        {phase === 'rendering' && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Rendering image…
          </div>
        )}
        <img
          src={previewUrl}
          alt={docType}
          onLoad={() => setPhase('ready')}
          onError={() => setPhase('failed')}
          className="max-w-full h-auto rounded-md border border-border"
        />
        {downloadLink('Download image')}
      </div>
    )
  }

  if (media.kind === 'pdf' && previewUrl) {
    return (
      <div className="flex flex-col gap-2">
        <iframe src={previewUrl} title={docType} className="w-full h-[60dvh] rounded-md border border-border" />
        {downloadLink('Download PDF')}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2 py-4 text-center">
      <FileQuestion className="h-7 w-7 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">Binary file ({sizeKb} KB)</p>
      {downloadLink('Download file')}
    </div>
  )
}
