import { useState, useCallback } from 'react'
import { FileText, RefreshCw, Unlock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getDoctorTokens, getTokenInfo, getDocument, getEncryptedKey } from '@/lib/stellar'
import { getDoctorRecords, saveDoctorRecord, type DoctorRecord } from '@/lib/doctorstore'
import { downloadEncryptedPayload } from '@/lib/ipfs'
import { decryptFile, decodePayload } from '@/lib/encryption'
import { unwrapAesKey } from '@/lib/ecies'
import { loadPrivateKey } from '@/lib/doctorkey'
import { t, type Lang } from '@/lib/i18n'
import { RecordContent } from './RecordContent'

interface DoctorRecordsProps {
  doctorPublicKey: string
  lang: Lang
}

function RecordCard({
  record,
  onOpen,
  lang,
}: {
  record: DoctorRecord & { isExpired: boolean }
  onOpen: (record: DoctorRecord) => void
  lang: Lang
}) {
  const date = new Date(record.accessedAt * 1000).toLocaleDateString()

  return (
    <div className="flex items-center gap-3 py-3 px-3.5 rounded-lg border border-border bg-card">
      <div className="rounded-md border border-border bg-muted/30 p-1.5 shrink-0">
        <FileText className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate capitalize">
          {record.docType.replace(/_/g, ' ')}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {record.patientAddress.slice(0, 6)}...{record.patientAddress.slice(-4)} · {date}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {record.isExpired && (
          <Badge variant="outline" className="text-[10px] text-muted-foreground px-1.5">
            {t('doctor', 'expired', lang)}
          </Badge>
        )}
        <Button
          size="sm"
          variant="default"
          className="h-7 px-2 gap-1 text-xs"
          onClick={() => onOpen(record)}
        >
          <Unlock className="h-3 w-3" />{t('doctor', 'read', lang)}
        </Button>
      </div>
    </div>
  )
}

export function DoctorRecords({ doctorPublicKey, lang }: DoctorRecordsProps) {
  const [records, setRecords] = useState<(DoctorRecord & { isExpired: boolean })[]>([])
  const [loading, setLoading] = useState(false)
  const [activeRecord, setActiveRecord] = useState<DoctorRecord | null>(null)
  const [data, setData] = useState<ArrayBuffer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [decrypting, setDecrypting] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const tokenIds = await getDoctorTokens(doctorPublicKey)
      const now = Math.floor(Date.now() / 1000)
      const localRecords = getDoctorRecords()

      const enriched = await Promise.all(
        tokenIds.map(async (tokenId) => {
          const local = localRecords.find((r) => r.tokenId === tokenId)
          const tokenInfo = await getTokenInfo(tokenId).catch(() => null)
          const isExpired = !tokenInfo || tokenInfo.expiresAt < now

          if (local) return { ...local, isExpired }

          if (tokenInfo) {
            const doc = await getDocument(tokenInfo.documentId).catch(() => null)
            const record: DoctorRecord = {
              tokenId,
              documentId: tokenInfo.documentId,
              cid: doc?.cid ?? '',
              docType: doc?.docType ?? 'document',
              patientAddress: tokenInfo.patient,
              createdAt: doc?.createdAt ?? 0,
              accessedAt: Math.floor(Date.now() / 1000),
            }
            saveDoctorRecord(record)
            return { ...record, isExpired }
          }

          return null
        })
      )

      setRecords(enriched.filter(Boolean) as (DoctorRecord & { isExpired: boolean })[])
    } finally {
      setLoading(false)
    }
  }, [doctorPublicKey])

  async function openRecord(record: DoctorRecord) {
    setActiveRecord(record)
    setData(null)
    setError(null)
    setDecrypting(true)
    try {
      if (!record.cid) throw new Error(t('doctor', 'err_doc_not_loaded', lang))
      const encryptedKeyBytes = await getEncryptedKey(record.tokenId)
      if (!encryptedKeyBytes) throw new Error(t('doctor', 'err_key_not_found', lang))
      const priv = await loadPrivateKey(doctorPublicKey)
      const aesKey = await unwrapAesKey(encryptedKeyBytes, priv)
      const payload = await downloadEncryptedPayload(record.cid)
      const { ciphertext, iv } = decodePayload(payload)
      const plaintext = await decryptFile(ciphertext, iv, aesKey)
      setData(plaintext)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('doctor', 'err_decryption_failed', lang))
    } finally {
      setDecrypting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">{t('doctor', 'shared_title', lang)}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('doctor', 'shared_sub', lang)}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={refresh} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {t('doctor', 'refresh', lang)}
        </Button>
      </div>

      {!loading && records.length === 0 && (
        <Card className="shadow-none border-dashed">
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
            <FileText className="h-7 w-7 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('doctor', 'empty_title', lang)}</p>
            <p className="text-xs text-muted-foreground">
              {t('doctor', 'empty_sub', lang)}
            </p>
          </CardContent>
        </Card>
      )}

      {loading && Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-[60px] rounded-lg" />
      ))}

      <div className="flex flex-col gap-2">
        {records.map((r) => (
          <RecordCard key={r.tokenId} record={r} onOpen={openRecord} lang={lang} />
        ))}
      </div>

      <Dialog open={!!activeRecord} onOpenChange={(open) => { if (!open) { setActiveRecord(null); setData(null); setError(null) } }}>
        <DialogContent className="w-[calc(100vw-32px)] max-w-md max-h-[85dvh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border">
            <DialogTitle className="text-base capitalize flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {activeRecord?.docType.replace(/_/g, ' ')}
            </DialogTitle>
          </DialogHeader>
          <div className="px-5 py-4">
            {decrypting ? (
              <div className="flex flex-col gap-2 py-4">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            ) : error ? (
              <p className="text-sm text-destructive py-2">{error}</p>
            ) : data ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-xs text-muted-foreground flex-1">
                    {t('doctor', 'patient_label', lang)}: <span className="font-mono">{activeRecord?.patientAddress.slice(0, 8)}...{activeRecord?.patientAddress.slice(-4)}</span>
                  </p>
                  <Badge className="bg-green-50 text-green-700 border border-green-200 text-xs">
                    {t('doctor', 'decrypted', lang)}
                  </Badge>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    {t('doctor', 'clinical_record', lang)}
                  </p>
                  <RecordContent data={data} docType={activeRecord?.docType ?? 'document'} />
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-3">
                  {t('doctor', 'in_memory', lang)}
                </p>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
