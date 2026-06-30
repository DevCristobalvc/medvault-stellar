import { useEffect, useState } from 'react'
import { ShieldCheck, Clock, QrCode, FileText, RefreshCw, UserCheck, ShieldX, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useDocuments } from '@/hooks/useDocuments'
import { getAuditLog, grantAccess, revokeAccess, getPubkey, isTransientError, type AccessEvent } from '@/lib/stellar'
import { deriveDocumentKey } from '@/lib/keystore'
import { downloadEncryptedPayload } from '@/lib/ipfs'
import { decodePayload, importKey } from '@/lib/encryption'
import { getStoredDocumentKey } from '@/lib/dockeys'
import { saveActiveToken, getActiveTokens, removeToken, type ActiveToken } from '@/lib/tokenstore'
import { wrapAesKey } from '@/lib/ecies'
import { cn } from '@/lib/utils'
import { t, type Lang } from '@/lib/i18n'
import { QRGenerator } from './QRGenerator'

const DURATION_OPTIONS = [
  { key: 'dur_1h', seconds: 3600 },
  { key: 'dur_24h', seconds: 86400 },
  { key: 'dur_7d', seconds: 604800 },
] as const

interface PatientVaultProps { publicKey: string; lang: Lang }

type DocItem = { id: string; cid: string; docType: string; createdAt: number; doctor: string }

function DocumentCard({ doc, lang }: { doc: DocItem; lang: Lang }) {
  const date = new Date(doc.createdAt * 1000).toLocaleDateString()
  return (
    <div className="flex items-center gap-3 py-3 px-3.5 rounded-lg border border-border bg-card w-full text-left cursor-pointer hover:bg-muted/30 transition-colors">
      <div className="rounded-md border border-border bg-muted/30 p-1.5 shrink-0">
        <FileText className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight truncate capitalize">
          {doc.docType.replace(/_/g, ' ')}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
      </div>
      <div className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/5 border border-primary/15 rounded-md px-2 py-1">
        <QrCode className="h-3 w-3" />
        {t('patient', 'share', lang)}
      </div>
    </div>
  )
}

function ActiveTokenCard({
  token, onRevoke, onViewQR, revoking, lang,
}: {
  token: ActiveToken
  onRevoke: (tokenId: string) => void
  onViewQR: (token: ActiveToken) => void
  revoking: boolean
  lang: Lang
}) {
  const expiresIn = token.expiresAt - Math.floor(Date.now() / 1000)
  const h = Math.floor(expiresIn / 3600)
  const m = Math.floor((expiresIn % 3600) / 60)
  const label = h > 24 ? `${Math.floor(h / 24)}d` : h > 0 ? `${h}h ${m}m` : `${m}m`
  const urgent = expiresIn < 3600

  return (
    <div className="flex items-center gap-2 py-2">
      <div className="min-w-0 flex-1">
        <p className="font-mono text-xs text-foreground truncate">
          {token.doctorAddress.slice(0, 8)}...{token.doctorAddress.slice(-4)}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Clock className={`h-3 w-3 ${urgent ? 'text-amber-500' : 'text-muted-foreground'}`} />
          <span className={`text-xs ${urgent ? 'text-amber-500' : 'text-muted-foreground'}`}>
            {t('patient', 'expires_in', lang)} {label}
          </span>
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        <Button variant="ghost" size="sm" onClick={() => onViewQR(token)}
          className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10">
          <QrCode className="h-3.5 w-3.5 mr-1" />QR
        </Button>
        <Button variant="ghost" size="sm" disabled={revoking} onClick={() => onRevoke(token.tokenId)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 px-2 text-xs">
          <ShieldX className="h-3.5 w-3.5 mr-1" />{t('patient', 'revoke', lang)}
        </Button>
      </div>
    </div>
  )
}

function AuditEntry({ event, lang }: { event: AccessEvent; lang: Lang }) {
  const date = new Date(event.accessedAt * 1000).toLocaleString()
  return (
    <div className="flex justify-between items-start py-2.5 gap-3">
      <div className="min-w-0">
        <p className="font-mono text-xs text-foreground truncate">
          {event.doctor.slice(0, 8)}...{event.doctor.slice(-4)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
      </div>
      <Badge variant="outline" className="text-xs shrink-0">{t('patient', 'read', lang)}</Badge>
    </div>
  )
}

type GrantStep = 'address' | 'duration' | 'loading' | 'done' | 'error'

interface GrantState {
  docId: string
  doctorAddress: string
  encryptionKey: string | null
  tokenId: string | null
  expiresAt: number
  step: GrantStep
  error: string | null
  transient?: boolean
}

export function PatientVault({ publicKey, lang }: PatientVaultProps) {
  const { documents, loading, error, reload } = useDocuments(publicKey)
  const [auditLog, setAuditLog] = useState<AccessEvent[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [grantState, setGrantState] = useState<GrantState | null>(null)
  const [doctorInput, setDoctorInput] = useState('')
  const [activeTokens, setActiveTokens] = useState<ActiveToken[]>([])
  const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  useEffect(() => { reload() }, [reload])

  function openGrant(doc: DocItem) {
    setDoctorInput('')
    setSelectedDoc(doc)
    setActiveTokens(getActiveTokens(doc.id))
    setGrantState({ docId: doc.id, doctorAddress: '', encryptionKey: null, tokenId: null, expiresAt: 0, step: 'address', error: null })
  }

  function showExistingTokenQR(token: ActiveToken) {
    setGrantState({
      docId: token.documentId,
      doctorAddress: token.doctorAddress,
      encryptionKey: null,
      tokenId: token.tokenId,
      expiresAt: token.expiresAt,
      step: 'done',
      error: null,
    })
  }

  function confirmDoctor() {
    const addr = doctorInput.trim()
    if (!addr.startsWith('G') || addr.length < 56) return
    setGrantState((s) => s && { ...s, doctorAddress: addr, step: 'duration' })
  }

  async function handleGrantAccess(durationSeconds: number) {
    if (!grantState || !selectedDoc) return
    const expiresAt = Math.floor(Date.now() / 1000) + durationSeconds
    setGrantState((s) => s && { ...s, step: 'loading', expiresAt })
    try {
      const doctorPub = await getPubkey(grantState.doctorAddress)
      if (!doctorPub) {
        throw new Error(t('patient', 'doctor_not_enabled', lang))
      }
      const stored = getStoredDocumentKey(selectedDoc.cid)
      let aesKey: CryptoKey
      if (stored) {
        aesKey = await importKey(stored)
      } else {
        const payload = await downloadEncryptedPayload(selectedDoc.cid)
        const { salt } = decodePayload(payload)
        aesKey = await deriveDocumentKey(salt)
      }
      const encryptedKeyBytes = await wrapAesKey(aesKey, doctorPub)

      const tokenId = await grantAccess(
        grantState.doctorAddress,
        grantState.docId,
        expiresAt,
        encryptedKeyBytes
      )

      saveActiveToken({
        tokenId,
        documentId: grantState.docId,
        doctorAddress: grantState.doctorAddress,
        expiresAt,
      })
      setActiveTokens(getActiveTokens(grantState.docId))
      setGrantState((s) => s && {
        ...s,
        tokenId,
        encryptionKey: null,
        step: 'done',
      })
    } catch (e) {
      if (isTransientError(e)) {
        setGrantState((s) => s && {
          ...s,
          step: 'error',
          transient: true,
          error: t('patient', 'net_busy_grant', lang),
        })
        return
      }
      setGrantState((s) => s && { ...s, step: 'error', transient: false, error: e instanceof Error ? e.message : t('patient', 'grant_failed', lang) })
    }
  }

  async function handleRevoke(tokenId: string) {
    if (!selectedDoc) return
    setRevokingId(tokenId)
    try {
      await revokeAccess(tokenId, publicKey)
      removeToken(tokenId)
      setActiveTokens(getActiveTokens(selectedDoc.id))
    } catch (e) {
      console.error('Revoke failed:', e)
    } finally {
      setRevokingId(null)
    }
  }

  function closeDialog() {
    setSelectedDoc(null)
    setGrantState(null)
    setDoctorInput('')
    setActiveTokens([])
  }

  async function loadAudit() {
    setAuditLoading(true)
    try {
      const log = await getAuditLog(publicKey)
      setAuditLog(log.slice().reverse())
    } finally {
      setAuditLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 px-5 py-6 md:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{t('patient', 'my_vault', lang)}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? '...' : `${documents.length} ${t('patient', documents.length !== 1 ? 'doc_plural' : 'doc_singular', lang)}`}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={reload} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex flex-col gap-2">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[60px] rounded-lg" />)
          : documents.length === 0
          ? (
            <Card className="shadow-none border-dashed">
              <CardContent className="flex flex-col items-center gap-2 py-10">
                <ShieldCheck className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t('patient', 'no_documents', lang)}</p>
              </CardContent>
            </Card>
          )
          : documents.map((doc) => (
            <button key={doc.id} className="w-full text-left" onClick={() => openGrant(doc)}>
              <DocumentCard doc={doc} lang={lang} />
            </button>
          ))}
      </div>

      <Dialog open={!!selectedDoc} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent className="w-[calc(100vw-32px)] max-w-md max-h-[85dvh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
            <DialogTitle className="text-base capitalize">
              {selectedDoc?.docType.replace(/_/g, ' ') ?? ''}
            </DialogTitle>
          </DialogHeader>

          <div className="px-5 py-4 flex flex-col gap-4">
            {activeTokens.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
                <p className="text-xs font-medium text-amber-700 flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t('patient', 'active_accesses', lang)} ({activeTokens.length})
                </p>
                <div className="divide-y divide-amber-100">
                  {activeTokens.map((t) => (
                    <ActiveTokenCard
                      key={t.tokenId}
                      token={t}
                      onRevoke={handleRevoke}
                      onViewQR={showExistingTokenQR}
                      revoking={revokingId === t.tokenId}
                      lang={lang}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                {t('patient', 'grant_new', lang)}
              </p>

              {grantState?.step === 'address' && (
                <div className="flex flex-col gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="doctor-addr" className="flex items-center gap-1.5 text-sm">
                      <UserCheck className="h-3.5 w-3.5" />
                      {t('patient', 'doctor_addr', lang)}
                    </Label>
                    <Input
                      id="doctor-addr"
                      placeholder="G..."
                      value={doctorInput}
                      onChange={(e) => setDoctorInput(e.target.value)}
                      className="font-mono text-sm"
                      autoComplete="off"
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('patient', 'doctor_addr_help', lang)}
                    </p>
                  </div>
                  <Button
                    onClick={confirmDoctor}
                    disabled={!doctorInput.trim().startsWith('G') || doctorInput.trim().length < 56}
                  >
                    {t('patient', 'continue', lang)}
                  </Button>
                </div>
              )}

              {grantState?.step === 'duration' && (
                <div className="flex flex-col gap-2.5">
                  <div className="rounded-lg bg-muted/40 border border-border px-3 py-2">
                    <p className="text-xs text-muted-foreground">{t('patient', 'doctor_wallet', lang)}</p>
                    <p className="font-mono text-xs truncate" title={grantState.doctorAddress}>
                      {grantState.doctorAddress.slice(0, 8)}...{grantState.doctorAddress.slice(-6)}
                    </p>
                  </div>
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                    {t('patient', 'access_duration', lang)}
                  </Label>
                  {DURATION_OPTIONS.map((opt) => (
                    <Button
                      key={opt.seconds}
                      variant="outline"
                      className="justify-between"
                      onClick={() => handleGrantAccess(opt.seconds)}
                    >
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {t('patient', opt.key, lang)}
                      </span>
                      <span className="text-muted-foreground text-xs">→</span>
                    </Button>
                  ))}
                </div>
              )}

              {grantState?.step === 'loading' && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <Skeleton className="h-[200px] w-[200px] rounded-lg" />
                  <Skeleton className="h-3 w-28" />
                </div>
              )}

              {grantState?.step === 'error' && (
                <div className="flex flex-col items-start gap-2 py-2">
                  <p className={cn('text-sm', grantState.transient ? 'text-muted-foreground' : 'text-destructive')}>
                    {grantState.error}
                  </p>
                  {grantState.transient && (
                    <Button variant="outline" size="sm" onClick={() => handleGrantAccess(Math.max(60, grantState.expiresAt - Math.floor(Date.now() / 1000)))}>
                      {t('patient', 'try_again', lang)}
                    </Button>
                  )}
                </div>
              )}

              {grantState?.step === 'done' && grantState.tokenId && (
                <QRGenerator
                  tokenId={grantState.tokenId}
                  expiresAt={grantState.expiresAt}
                  lang={lang}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Separator />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">{t('patient', 'access_log', lang)}</h2>
          <Button variant="ghost" size="sm" onClick={loadAudit} disabled={auditLoading}>
            {auditLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : t('patient', 'load', lang)}
          </Button>
        </div>
        {auditLog.length === 0 && !auditLoading
          ? <p className="text-xs text-muted-foreground">{t('patient', 'no_accesses', lang)}</p>
          : <div className="flex flex-col divide-y divide-border">
              {auditLog.map((e, i) => <AuditEntry key={i} event={e} lang={lang} />)}
            </div>
        }
      </div>
    </div>
  )
}
