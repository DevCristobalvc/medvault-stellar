import { useEffect, useState } from 'react'
import { ShieldCheck, Clock, QrCode, FileText, RefreshCw, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useDocuments } from '@/hooks/useDocuments'
import { getAuditLog, grantAccess, type AccessEvent } from '@/lib/stellar'
import { getDocumentKey } from '@/lib/keystore'
import { QRGenerator } from './QRGenerator'

const DURATION_OPTIONS = [
  { label: '1 hour', seconds: 3600 },
  { label: '24 hours', seconds: 86400 },
  { label: '7 days', seconds: 604800 },
]

interface PatientVaultProps {
  publicKey: string
}

function DocumentCard({
  doc,
}: {
  doc: { id: string; cid: string; docType: string; createdAt: number; doctor: string }
}) {
  const date = new Date(doc.createdAt * 1000).toLocaleDateString()
  return (
    <div className="flex items-start justify-between gap-3 py-4 px-4 rounded-lg border border-border bg-card w-full text-left">
      <div className="flex gap-3 min-w-0">
        <div className="mt-0.5 rounded-md border border-border p-1.5 shrink-0">
          <FileText className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight truncate">{doc.docType.replace(/_/g, ' ')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
          <p className="font-mono text-xs text-muted-foreground truncate mt-0.5">
            {doc.doctor.slice(0, 6)}...{doc.doctor.slice(-4)}
          </p>
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-1.5 text-xs text-primary font-medium">
        <QrCode className="h-3.5 w-3.5" />
        Share
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

  useEffect(() => { reload() }, [reload])

  function openGrant(docId: string) {
    setDoctorInput('')
    const encryptionKey = getDocumentKey(docId)
    setGrantState({ docId, doctorAddress: '', encryptionKey, tokenId: null, expiresAt: 0, step: 'address', error: null })
  }

  function confirmDoctor() {
    if (!doctorInput.trim().startsWith('G') || doctorInput.trim().length < 56) return
    setGrantState((s) => s && { ...s, doctorAddress: doctorInput.trim(), step: 'duration' })
  }

  async function handleGrantAccess(durationSeconds: number) {
    if (!grantState) return
    const expiresAt = Math.floor(Date.now() / 1000) + durationSeconds
    setGrantState((s) => s && { ...s, step: 'loading', expiresAt })
    try {
      const tokenId = await grantAccess(grantState.doctorAddress, grantState.docId, expiresAt)
      setGrantState((s) => s && { ...s, tokenId, step: 'done' })
    } catch (e) {
      setGrantState((s) => s && { ...s, step: 'error', error: e instanceof Error ? e.message : 'Failed' })
    }
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

  function resetGrant() {
    setGrantState(null)
    setDoctorInput('')
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
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[72px] rounded-lg" />)
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
            <Sheet key={doc.id} onOpenChange={(open) => { if (!open) resetGrant() }}>
              <SheetTrigger className="w-full" onClick={() => openGrant(doc.id)}>
                <DocumentCard doc={doc} />
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl max-h-[90dvh] overflow-y-auto">
                <SheetHeader className="pb-4">
                  <SheetTitle className="text-left">Grant Access</SheetTitle>
                </SheetHeader>

                {grantState?.step === 'address' && (
                  <div className="flex flex-col gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="doctor-addr" className="flex items-center gap-1.5">
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
                        The doctor must connect this wallet to access the record.
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
                  <div className="flex flex-col gap-3">
                    <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 mb-1">
                      <p className="text-xs text-muted-foreground">Doctor</p>
                      <p className="font-mono text-xs truncate">{grantState.doctorAddress}</p>
                    </div>
                    <Label className="text-muted-foreground text-xs uppercase tracking-wide">Access duration</Label>
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
                  <div className="flex flex-col gap-3 py-6">
                    <Skeleton className="h-[240px] w-[240px] mx-auto rounded-lg" />
                    <Skeleton className="h-4 w-28 mx-auto" />
                  </div>
                )}

                {grantState?.step === 'error' && (
                  <p className="text-sm text-destructive py-4">{grantState.error}</p>
                )}

                {grantState?.step === 'done' && grantState.tokenId && (
                  <QRGenerator
                    tokenId={grantState.tokenId}
                    expiresAt={grantState.expiresAt}
                    encryptionKey={grantState.encryptionKey}
                  />
                )}
              </SheetContent>
            </Sheet>
          ))}
      </div>

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
