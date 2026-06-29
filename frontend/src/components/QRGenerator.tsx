import { useEffect, useState, useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Download, Clock, Copy, Check, ExternalLink, Key } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface QRGeneratorProps {
  tokenId: string
  expiresAt: number
  encryptionKey?: string | null
  baseUrl?: string
}

function useCountdown(expiresAt: number) {
  const [remaining, setRemaining] = useState(expiresAt - Math.floor(Date.now() / 1000))

  useEffect(() => {
    const t = setInterval(() => {
      setRemaining(expiresAt - Math.floor(Date.now() / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [expiresAt])

  return remaining
}

function formatRemaining(seconds: number) {
  if (seconds <= 0) return 'Expired'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

export function QRGenerator({ tokenId, expiresAt, encryptionKey, baseUrl }: QRGeneratorProps) {
  const remaining = useCountdown(expiresAt)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)
  const [keyCopied, setKeyCopied] = useState(false)
  const expired = remaining <= 0

  const base = `${baseUrl ?? window.location.origin}/doctor?token=${tokenId}`
  const url = encryptionKey
    ? `${base}#wk=${encodeURIComponent(encryptionKey)}`
    : base

  function download() {
    const canvas = document.querySelector<HTMLCanvasElement>('#qr-canvas canvas')
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `medvault-access-${tokenId.slice(0, 8)}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  async function copyLink() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function copyKey() {
    if (!encryptionKey) return
    await navigator.clipboard.writeText(encryptionKey)
    setKeyCopied(true)
    setTimeout(() => setKeyCopied(false), 2000)
  }


  return (
    <Card className="w-full max-w-xs mx-auto">
      <CardContent className="flex flex-col items-center gap-4 pt-6">
        <div
          id="qr-canvas"
          className={`p-3 rounded-lg border border-border bg-white transition-opacity ${expired ? 'opacity-30' : ''}`}
        >
          <QRCodeCanvas
            ref={canvasRef}
            value={url}
            size={220}
            level="H"
            marginSize={1}
            fgColor="#0A0A0A"
          />
        </div>

        <div className="flex items-center gap-1.5 text-sm">
          <Clock className={`h-4 w-4 ${remaining < 3600 ? 'text-amber-500' : 'text-muted-foreground'}`} />
          <span className={`font-mono font-medium ${expired ? 'text-destructive' : remaining < 3600 ? 'text-amber-500' : 'text-foreground'}`}>
            {formatRemaining(remaining)}
          </span>
        </div>

        {!expired && (
          <div className="flex flex-col gap-2 w-full">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 w-full h-8 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in browser
            </a>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={copyLink}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied!' : 'Copy link'}
              </Button>
              <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={download}>
                <Download className="h-3.5 w-3.5" />
                Save QR
              </Button>
            </div>
            {encryptionKey && (
              <Button variant="ghost" size="sm" className="w-full gap-1.5" onClick={copyKey}>
                {keyCopied ? <Check className="h-3.5 w-3.5" /> : <Key className="h-3.5 w-3.5" />}
                {keyCopied ? 'Key copied!' : 'Copy key only'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
