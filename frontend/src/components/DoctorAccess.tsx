import { useEffect, useState } from 'react'
import { ShieldCheck, ShieldX, Loader2, FileText, Key } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { verifyAccess, logAccess, getTokenInfo, getDocument, getEncryptedKey, type Document } from '@/lib/stellar'
import { downloadEncryptedPayload } from '@/lib/ipfs'
import { decryptFile, decodePayload } from '@/lib/encryption'
import { decryptKeyWithWK, base64ToWk } from '@/lib/ecies'
import { saveDoctorRecord } from '@/lib/doctorstore'

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
      const tokenInfo = await getTokenInfo(tokenId)

      if (!tokenInfo) {
        setStatus({ phase: 'invalid', reason: 'Access token not found or expired.' })
        return
      }

      if (tokenInfo.doctor !== doctorPublicKey) {
        setStatus({
          phase: 'invalid',
          reason: `This token requires wallet ${tokenInfo.doctor.slice(0, 6)}…${tokenInfo.doctor.slice(-4)}. You are connected with ${doctorPublicKey.slice(0, 6)}…${doctorPublicKey.slice(-4)}.`,
        })
        return
      }

      const valid = await verifyAccess(tokenId, doctorPublicKey)
      if (!valid) {
        setStatus({ phase: 'invalid', reason: 'Access token has expired.' })
        return
      }

      setStatus({ phase: 'needs_key', tokenInfo })
    } catch (e) {
      setStatus({ phase: 'invalid', reason: e instanceof Error ? e.message : 'Verification failed.' })
    }
  }

  async function decrypt(wkB64: string, tokenInfo: { documentId: string; patient: string }) {
    setStatus({ phase: 'decrypting' })
    try {
      const doc = await getDocument(tokenInfo.documentId)
      if (!doc) throw new Error('Document not found on-chain')

      const encryptedKeyBytes = await getEncryptedKey(tokenId)
      if (!encryptedKeyBytes || encryptedKeyBytes.length === 0) {
        throw new Error('Encrypted key not found in contract')
      }

      const wk = base64ToWk(wkB64)
      const aesKey = await decryptKeyWithWK(encryptedKeyBytes, wk)

      const payload = await downloadEncryptedPayload(doc.cid)
      const { ciphertext, iv } = decodePayload(payload)
      const plaintext = await decryptFile(ciphertext, iv, aesKey)
      const content = new TextDecoder().decode(plaintext)

      await logAccess(tokenId, tokenInfo.patient)

      saveDoctorRecord({
        tokenId,
        documentId: tokenInfo.documentId,
        cid: doc.cid,
        docType: doc.docType,
        patientAddress: tokenInfo.patient,
        createdAt: doc.createdAt,
        accessedAt: Math.floor(Date.now() / 1000),
        encryptionKey: wkB64,
      })

      setStatus({ phase: 'ready', content, doc })
    } catch (e) {
      setStatus({ phase: 'invalid', reason: e instanceof Error ? e.message : 'Decryption failed.' })
    }
  }

  if (status.phase === 'verifying' || status.phase === 'decrypting') {
    return (
      <div className="flex flex-col items-center gap-3 px-5 py-10">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {status.phase === 'verifying' ? 'Verifying on Stellar...' : 'Decrypting record...'}
        </p>
        <Skeleton className="h-3 w-40 mt-1" />
        <Skeleton className="h-3 w-28" />
      </div>
    )
  }

  if (status.phase === 'invalid') {
    return (
      <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
        <div className="rounded-full bg-destructive/8 p-3">
          <ShieldX className="h-6 w-6 text-destructive" />
        </div>
        <p className="font-medium text-sm">Access denied</p>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">{status.reason}</p>
        <Button variant="outline" size="sm" onClick={verify}>Retry</Button>
      </div>
    )
  }

  if (status.phase === 'needs_key') {
    const tokenInfo = status.tokenInfo
    return (
      <div className="flex flex-col gap-4 px-4 py-5">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-100">
          <ShieldCheck className="h-5 w-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">Access verified</p>
            <p className="text-xs text-green-600 mt-0.5">Waiting for encryption key</p>
          </div>
          <Badge className="ml-auto bg-accent/20 text-accent-foreground border border-accent/30 text-xs shrink-0">
            Valid
          </Badge>
        </div>

        <div className="rounded-lg border border-border p-3 flex flex-col gap-2.5">
          <Label htmlFor="key" className="flex items-center gap-1.5 text-xs font-medium">
            <Key className="h-3.5 w-3.5 text-muted-foreground" />
            Encryption key
          </Label>
          <p className="text-xs text-muted-foreground">
            Paste the key shared by the patient (if not in the QR)
          </p>
          <Input
            id="key"
            value={manualKey}
            onChange={(e) => setManualKey(e.target.value)}
            placeholder="Base64 key..."
            className="font-mono text-xs h-8"
          />
          <Button
            size="sm"
            disabled={!manualKey.trim()}
            onClick={() => decrypt(manualKey.trim(), tokenInfo)}
          >
            Decrypt record
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      <div className="flex items-center gap-2.5 pb-1">
        <div className="rounded-md border border-border bg-muted/30 p-1.5 shrink-0">
          <FileText className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium capitalize truncate">
            {status.doc.docType.replace(/_/g, ' ')}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(status.doc.createdAt * 1000).toLocaleDateString()}
          </p>
        </div>
        <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs shrink-0">
          Verified
        </Badge>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
          Clinical Record
        </p>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{status.content}</p>
      </div>

      <p className="text-[10px] text-muted-foreground text-center py-0.5">
        Visible in this session only — not saved locally.
      </p>
    </div>
  )
}
