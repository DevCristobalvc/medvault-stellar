import { useState, useRef } from 'react'
import { Upload, FileText, Loader2, CheckCircle, Paperclip, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { encryptFile, encodePayload, generateKey, exportKey } from '@/lib/encryption'
import { uploadEncryptedPayload } from '@/lib/ipfs'
import { registerDocument, DOC_TYPES, type DocType } from '@/lib/stellar'
import { saveDocumentKey } from '@/lib/dockeys'
import { t, type Lang } from '@/lib/i18n'

type Step = 'idle' | 'encrypting' | 'uploading' | 'registering' | 'done'
type InputMode = 'text' | 'file'

function stepLabel(step: Step, lang: Lang): string {
  switch (step) {
    case 'encrypting': return t('doctor', 'step_encrypting', lang)
    case 'uploading': return t('doctor', 'step_uploading', lang)
    case 'registering': return t('doctor', 'step_registering', lang)
    case 'done': return t('doctor', 'step_done', lang)
    default: return ''
  }
}

const ACCEPTED_TYPES = '.txt,.pdf,.doc,.docx,.png,.jpg,.jpeg'

interface DocumentUploadProps {
  onSuccess?: (documentId: string) => void
  lang: Lang
}

export function DocumentUpload({ onSuccess, lang }: DocumentUploadProps) {
  const [mode, setMode] = useState<InputMode>('text')
  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [patientAddress, setPatientAddress] = useState('')
  const [docType, setDocType] = useState<DocType>('clinical_history')
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const busy = step !== 'idle' && step !== 'done'

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null)
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
      setError(t('doctor', 'err_patient', lang))
      return
    }
    if (mode === 'text' ? !content.trim() : !file) {
      setError(mode === 'text' ? t('doctor', 'err_content', lang) : t('doctor', 'err_file', lang))
      return
    }

    try {
      setStep('encrypting')
      const key = await generateKey()
      const data = await getDataBuffer()
      const { ciphertext, iv } = await encryptFile(data, key)
      const payload = encodePayload(ciphertext, iv)

      setStep('uploading')
      const cid = await uploadEncryptedPayload(payload, { docType, patientAddress })
      saveDocumentKey(cid, await exportKey(key))

      setStep('registering')
      const documentId = await registerDocument(patientAddress, cid, docType)

      setStep('done')
      onSuccess?.(documentId)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('doctor', 'err_unknown', lang))
      setStep('idle')
    }
  }

  if (step === 'done') {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10">
          <CheckCircle className="h-10 w-10 text-green-500" />
          <p className="text-sm font-medium">{t('doctor', 'done_title', lang)}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setStep('idle'); setContent(''); setFile(null) }}
          >
            {t('doctor', 'upload_another', lang)}
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
          {t('doctor', 'new_record', lang)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="patient">{t('doctor', 'patient_addr', lang)}</Label>
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
            <Label htmlFor="doctype">{t('doctor', 'doc_type', lang)}</Label>
            <select
              id="doctype"
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocType)}
              disabled={busy}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {DOC_TYPES.map((dt) => (
                <option key={dt} value={dt}>{t('doctype', dt, lang)}</option>
              ))}
            </select>
          </div>

          <Separator />

          <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
            {(['text', 'file'] as InputMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setContent(''); clearFile() }}
                disabled={busy}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
                  mode === m
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'text' ? t('doctor', 'write_text', lang) : t('doctor', 'upload_file', lang)}
              </button>
            ))}
          </div>

          {mode === 'text' ? (
            <div className="space-y-1.5">
              <Label htmlFor="content">{t('doctor', 'clinical_content', lang)}</Label>
              <Textarea
                id="content"
                rows={6}
                placeholder={t('doctor', 'content_placeholder', lang)}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={busy}
                className="resize-none text-sm"
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>{t('doctor', 'file_label', lang)}</Label>
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
                  <span>{t('doctor', 'click_select', lang)}</span>
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
                {stepLabel(step, lang)}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {t('doctor', 'encrypt_upload', lang)}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
