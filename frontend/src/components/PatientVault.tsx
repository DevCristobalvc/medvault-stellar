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
import { getAuditLog, grantAccess, revokeAccess, type AccessEvent } from '@/lib/stellar'
import { getDocumentKey } from '@/lib/keystore'
import { saveActiveToken, getActiveTokens, removeToken, type ActiveToken } from '@/lib/tokenstore'
import { generateWrappingKey, encryptKeyWithWK, wkToBase64 } from '@/lib/ecies'
import { importKey } from '@/lib/encryption'
import { QRGenerator } from './QRGenerator'

const DURATION_OPTIONS = [
  { label: '1 hour', seconds: 3600 },
  { label: '24 hours', seconds: 86400 },
  { label: '7 days', seconds: 604800 },
]

interface PatientVaultProps { publicKey: string }

type DocItem = { id: string; cid: string; docType: string; createdAt: number; doctor: string }

function DocumentCard({ doc }: { doc: DocItem }) {
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
        Share
      </div>
    </div>
  )
}

function ActiveTokenCard({
  token, onRevoke, onViewQR, revoking,
}: {
  token: ActiveToken
  onRevoke: (tokenId: string) => void
  onViewQR: (token: ActiveToken) => void
  revoking: boolean
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
            expires in {label}
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
          <ShieldX className="h-3.5 w-3.5 mr-1" />Revoke
        </Button>
      </div>
    </div>
  )
}

function AuditEntry({ event }: { event: AccessEvent }) {
  const date = new Date(event.accessedAt * 1000).toLocaleString()
  return (
    <div className="flex justify-between items-start py-2.5 gap-3">
      <div className="min-w-0">
        <p className="font-mono text-xs text-foreground truncate">
          {event.doctor.slice(0, 8)}...{event.doctor.slice(-4)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
      </div>
      <Badge variant="outline" className="text-xs shrink-0">read</Badge>
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
}

export function PatientVault({ publicKey }: PatientVaultProps) {
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
    const tokens = getActiveTokens(doc.id)
    setActiveTokens(tokens)
    const encryptionKey = getDocumentKey(doc.id)
    setGrantState({ docId: doc.id, doctorAddress: '', encryptionKey, tokenId: null, expiresAt: 0, step: 'address', error: null })
  }

  function showExistingTokenQR(token: ActiveToken) {
    const encryptionKey = getDocumentKey(token.documentId)
    setGrantState({
      docId: token.documentId,
      doctorAddress: token.doctorAddress,
      encryptionKey,
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
    if (!grantState) return
    const expiresAt = Math.floor(Date.now() / 1000) + durationSeconds
    setGrantState((s) => s && { ...s, step: 'loading', expiresAt })
    try {
      const keyB64 = getDocumentKey(grantState.docId)
      let encryptedKeyBytes: Uint8Array = new Uint8Array(60)
      let wk: Uint8Array | null = null

      if (keyB64) {
        const aesKey = await importKey(keyB64)
        wk = generateWrappingKey()
        encryptedKeyBytes = await encryptKeyWithWK(aesKey, wk)
      }

      const tokenId = await grantAccess(
        grantState.doctorAddress,
        grantState.docId,
        expiresAt,
        encryptedKeyBytes
      )

      const wrappingKeyB64 = wk ? wkToBase64(wk) : null
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
        encryptionKey: wrappingKeyB64,
        step: 'done',
      })
    } catch (e) {
      setGrantState((s) => s && { ...s, step: 'error', error: e instanceof Error ? e.message : 'Failed' })
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
          <h1 className="text-xl font-semibold tracking-tight">My Vault</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? '...' : `${documents.length} document${documents.length !== 1 ? 's' : ''}`}
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
                <p className="text-sm text-muted-foreground">No documents yet</p>
              </CardContent>
            </Card>
          )
          : documents.map((doc) => (
            <button key={doc.id} className="w-full text-left" onClick={() => openGrant(doc)}>
              <DocumentCard doc={doc} />
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
                  Active accesses ({activeTokens.length})
                </p>
                <div className="divide-y divide-amber-100">
                  {activeTokens.map((t) => (
                    <ActiveTokenCard
                      key={t.tokenId}
                      token={t}
                      onRevoke={handleRevoke}
                      onViewQR={showExistingTokenQR}
                      revoking={revokingId === t.tokenId}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Grant new access
              </p>

              {grantState?.step === 'address' && (
                <div className="flex flex-col gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="doctor-addr" className="flex items-center gap-1.5 text-sm">
                      <UserCheck className="h-3.5 w-3.5" />
                      Doctor&apos;s Stellar address
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
                      Only this wallet will be able to decrypt the record.
                    </p>
                  </div>
                  <Button
                    onClick={confirmDoctor}
                    disabled={!doctorInput.trim().startsWith('G') || doctorInput.trim().length < 56}
                  >
                    Continue
                  </Button>
                </div>
              )}

              {grantState?.step === 'duration' && (
                <div className="flex flex-col gap-2.5">
                  <div className="rounded-lg bg-muted/40 border border-border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Doctor wallet</p>
                    <p className="font-mono text-xs truncate">{grantState.doctorAddress}</p>
                  </div>
                  <Label className="text-muted-foreground text-xs uppercase tracking-wide">
                    Access duration
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
                        {opt.label}
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
                <p className="text-sm text-destructive py-2">{grantState.error}</p>
              )}

              {grantState?.step === 'done' && grantState.tokenId && (
                <QRGenerator
                  tokenId={grantState.tokenId}
                  expiresAt={grantState.expiresAt}
                  encryptionKey={grantState.encryptionKey}
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Separator />

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Access Log</h2>
          <Button variant="ghost" size="sm" onClick={loadAudit} disabled={auditLoading}>
            {auditLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Load'}
          </Button>
        </div>
        {auditLog.length === 0 && !auditLoading
          ? <p className="text-xs text-muted-foreground">No accesses recorded yet</p>
          : <div className="flex flex-col divide-y divide-border">
              {auditLog.map((e, i) => <AuditEntry key={i} event={e} />)}
            </div>
        }
      </div>
    </div>
  )
}
