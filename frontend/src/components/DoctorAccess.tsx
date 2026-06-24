import { useEffect, useState } from 'react'
import { ShieldCheck, ShieldX, Loader2, FileText, Key } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { verifyAccess, logAccess, getTokenInfo, getDocument, type Document } from '@/lib/stellar'
import { downloadEncryptedPayload } from '@/lib/ipfs'
import { importKey, decryptFile, decodePayload } from '@/lib/encryption'

type AccessStatus =
  | { phase: 'verifying' }
  | { phase: 'invalid'; reason: string }
  | { phase: 'needs_key'; tokenInfo: { documentId: string; patient: string } }
  | { phase: 'decrypting' }
  | { phase: 'ready'; content: string; doc: Document }

interface DoctorAccessProps {
  tokenId: string
  doctorPublicKey: string
  encryptionKey: string | null
}

export function DoctorAccess({ tokenId, doctorPublicKey, encryptionKey }: DoctorAccessProps) {
  const [status, setStatus] = useState<AccessStatus>({ phase: 'verifying' })
  const [manualKey, setManualKey] = useState('')

  useEffect(() => { verify() }, [tokenId, doctorPublicKey])

  useEffect(() => {
    if (status.phase === 'needs_key' && encryptionKey) {
      decrypt(encryptionKey, status.tokenInfo)
    }
  }, [encryptionKey, status.phase])

  async function verify() {
    setStatus({ phase: 'verifying' })
    try {
      const [valid, tokenInfo] = await Promise.all([
        verifyAccess(tokenId, doctorPublicKey),
        getTokenInfo(tokenId),
      ])

      if (!valid || !tokenInfo) {
        setStatus({ phase: 'invalid', reason: 'Access token is invalid or has expired.' })
        return
      }

      setStatus({ phase: 'needs_key', tokenInfo })
    } catch (e) {
      setStatus({ phase: 'invalid', reason: e instanceof Error ? e.message : 'Verification failed.' })
    }
  }

  async function decrypt(
    keyB64: string,
    tokenInfo: { documentId: string; patient: string }
  ) {
    setStatus({ phase: 'decrypting' })
    try {
      const doc = await getDocument(tokenInfo.documentId)
      if (!doc) throw new Error('Document not found on-chain')

      const payload = await downloadEncryptedPayload(doc.cid)
      const { ciphertext, iv } = decodePayload(payload)
      const key = await importKey(keyB64)
      const plaintext = await decryptFile(ciphertext, iv, key)
      const content = new TextDecoder().decode(plaintext)

      await logAccess(tokenId, tokenInfo.patient)

      setStatus({ phase: 'ready', content, doc })
    } catch (e) {
      setStatus({ phase: 'invalid', reason: e instanceof Error ? e.message : 'Decryption failed.' })
    }
  }

  if (status.phase === 'verifying' || status.phase === 'decrypting') {
    return (
      <div className="flex flex-col gap-4 px-5 py-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {status.phase === 'verifying' ? 'Verifying access on Stellar...' : 'Decrypting record...'}
          </p>
        </div>
        <Skeleton className="h-4 w-48 mx-auto" />
        <Skeleton className="h-4 w-36 mx-auto" />
      </div>
    )
  }

  if (status.phase === 'invalid') {
    return (
      <div className="flex flex-col items-center gap-4 px-5 py-8">
        <div className="rounded-full bg-destructive/10 p-4">
          <ShieldX className="h-8 w-8 text-destructive" />
        </div>
        <div className="text-center">
          <p className="font-medium text-sm">Access denied</p>
          <p className="text-xs text-muted-foreground mt-1">{status.reason}</p>
        </div>
        <Button variant="outline" size="sm" onClick={verify}>Retry</Button>
      </div>
    )
  }

  if (status.phase === 'needs_key') {
    const tokenInfo = status.tokenInfo
    return (
      <div className="flex flex-col gap-4 px-5 py-6">
        <div className="flex flex-col items-center gap-3 pb-2">
          <div className="rounded-full bg-green-50 p-4">
            <ShieldCheck className="h-8 w-8 text-green-600" />
          </div>
          <div className="text-center">
            <p className="font-medium text-sm">Access verified on Stellar</p>
            <p className="text-xs text-muted-foreground mt-1">
              Waiting for encryption key to decrypt the record
            </p>
          </div>
          <Badge className="bg-accent/20 text-accent-foreground border border-accent/30">
            Token valid
          </Badge>
        </div>

        <Card className="shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Key className="h-4 w-4" />
              Encryption key
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Label htmlFor="key" className="text-xs text-muted-foreground">
              Paste the key shared by the patient (if not included in the QR)
            </Label>
            <Input
              id="key"
              value={manualKey}
              onChange={(e) => setManualKey(e.target.value)}
              placeholder="Base64 key..."
              className="font-mono text-xs"
            />
            <Button
              size="sm"
              disabled={!manualKey.trim()}
              onClick={() => decrypt(manualKey.trim(), tokenInfo)}
            >
              Decrypt record
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-5 py-6">
      <div className="flex items-center gap-2">
        <div className="rounded-md border border-border p-1.5">
          <FileText className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">{status.doc.docType.replace(/_/g, ' ')}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(status.doc.createdAt * 1000).toLocaleDateString()}
          </p>
        </div>
        <Badge className="ml-auto bg-green-50 text-green-700 border border-green-200 text-xs">
          Verified
        </Badge>
      </div>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Clinical Record
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{status.content}</p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        This record is only visible in this session and is not saved locally.
      </p>
    </div>
  )
}
