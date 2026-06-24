import { useState } from 'react'
import { Upload, FileText, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { generateKey, encryptFile, exportKey, encodePayload } from '@/lib/encryption'
import { uploadEncryptedPayload } from '@/lib/ipfs'
import { registerDocument } from '@/lib/stellar'

type Step = 'idle' | 'encrypting' | 'uploading' | 'registering' | 'done'

const STEP_LABELS: Record<Step, string> = {
  idle: '',
  encrypting: 'Encrypting...',
  uploading: 'Uploading to IPFS...',
  registering: 'Registering on Stellar...',
  done: 'Document registered',
}

interface DocumentUploadProps {
  onSuccess?: (documentId: string, encryptionKey: string) => void
}

export function DocumentUpload({ onSuccess }: DocumentUploadProps) {
  const [content, setContent] = useState('')
  const [patientAddress, setPatientAddress] = useState('')
  const [docType, setDocType] = useState('clinical_history')
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState<string | null>(null)

  const busy = step !== 'idle' && step !== 'done'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || !patientAddress.trim()) return

    setError(null)
    try {
      setStep('encrypting')
      const key = await generateKey()
      const encoder = new TextEncoder()
      const { ciphertext, iv } = await encryptFile(encoder.encode(content).buffer, key)
      const payload = encodePayload(ciphertext, iv)
      const keyB64 = await exportKey(key)

      setStep('uploading')
      const cid = await uploadEncryptedPayload(payload, { docType, patientAddress })

      setStep('registering')
      const documentId = await registerDocument(patientAddress, cid, docType)

      setStep('done')
      onSuccess?.(documentId, keyB64)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
      setStep('idle')
    }
  }

  if (step === 'done') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10">
          <CheckCircle className="h-10 w-10 text-green-500" />
          <p className="text-sm font-medium">Document registered on Stellar</p>
          <Button variant="outline" size="sm" onClick={() => { setStep('idle'); setContent('') }}>
            Upload another
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          New Medical Record
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="patient">Patient Stellar address</Label>
            <Input
              id="patient"
              placeholder="G..."
              value={patientAddress}
              onChange={(e) => setPatientAddress(e.target.value)}
              className="font-mono text-sm"
              disabled={busy}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doctype">Document type</Label>
            <Input
              id="doctype"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              placeholder="clinical_history"
              disabled={busy}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="content">Clinical content</Label>
            <Textarea
              id="content"
              rows={6}
              placeholder="Write the clinical record here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={busy}
              className="resize-none text-sm"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button type="submit" disabled={busy || !content.trim() || !patientAddress.trim()}>
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {STEP_LABELS[step]}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Encrypt & Upload
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
