import { useState, useRef } from 'react'
import { Upload, FileText, Loader2, CheckCircle, Paperclip, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { encryptFile, encodePayload } from '@/lib/encryption'
import { uploadEncryptedPayload } from '@/lib/ipfs'
import { registerDocument } from '@/lib/stellar'
import { generateSalt, deriveDocumentKey } from '@/lib/keystore'

type Step = 'idle' | 'encrypting' | 'uploading' | 'registering' | 'done'
type InputMode = 'text' | 'file'

const STEP_LABELS: Record<Step, string> = {
  idle: '',
  encrypting: 'Encrypting...',
  uploading: 'Uploading to IPFS...',
  registering: 'Registering on Stellar...',
  done: 'Document registered',
}

const ACCEPTED_TYPES = '.txt,.pdf,.doc,.docx,.png,.jpg,.jpeg'

interface DocumentUploadProps {
  onSuccess?: (documentId: string) => void
}

export function DocumentUpload({ onSuccess }: DocumentUploadProps) {
  const [mode, setMode] = useState<InputMode>('text')
  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [patientAddress, setPatientAddress] = useState('')
  const [docType, setDocType] = useState('clinical_history')
  const [docTypeTouched, setDocTypeTouched] = useState(false)
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const busy = step !== 'idle' && step !== 'done'

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    if (f && !docTypeTouched) {
      const base = f.name.replace(/\.[^/.]+$/, '').trim()
      setDocType(base || f.name)
    }
  }

  function clearFile() {
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function getDataBuffer(): Promise<ArrayBuffer> {
    if (mode === 'file' && file) return file.arrayBuffer()
    return new TextEncoder().encode(content).buffer as ArrayBuffer
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setError(null)

    if (!patientAddress.trim()) {
      setError('Enter the patient Stellar address (starts with G).')
      return
    }
    if (mode === 'text' ? !content.trim() : !file) {
      setError(mode === 'text' ? 'Write the clinical content.' : 'Select a file to upload.')
      return
    }

    try {
      setStep('encrypting')
      const salt = generateSalt()
      const key = await deriveDocumentKey(salt)
      const data = await getDataBuffer()
      const { ciphertext, iv } = await encryptFile(data, key)
      const payload = encodePayload(ciphertext, iv, salt)

      setStep('uploading')
      const cid = await uploadEncryptedPayload(payload, { docType, patientAddress })

      setStep('registering')
      const documentId = await registerDocument(patientAddress, cid, docType)

      setStep('done')
      onSuccess?.(documentId)
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setStep('idle'); setContent(''); setFile(null) }}
          >
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
              onChange={(e) => { setDocType(e.target.value); setDocTypeTouched(true) }}
              placeholder="clinical_history"
              disabled={busy}
            />
          </div>

          <Separator />

          <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
            {(['text', 'file'] as InputMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m); setContent(''); clearFile()
                  if (!docTypeTouched) setDocType('clinical_history')
                }}
                disabled={busy}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                  mode === m
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'text' ? 'Write text' : 'Upload file'}
              </button>
            ))}
          </div>

          {mode === 'text' ? (
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
          ) : (
            <div className="space-y-1.5">
              <Label>File</Label>
              {file ? (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                  <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate flex-1">{file.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    type="button"
                    onClick={clearFile}
                    disabled={busy}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                  className="w-full rounded-lg border-2 border-dashed border-border py-8 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors flex flex-col items-center gap-2"
                >
                  <Upload className="h-5 w-5" />
                  <span>Click to select file</span>
                  <span className="text-xs">{ACCEPTED_TYPES}</span>
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={handleFileChange}
                disabled={busy}
                className="hidden"
              />
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button type="submit" disabled={busy}>
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
