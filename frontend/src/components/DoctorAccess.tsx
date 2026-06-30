import { useEffect, useState } from 'react'
import { ShieldX, Loader2, FileText, Wifi } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { verifyAccess, logAccess, getTokenInfo, getDocument, getEncryptedKey, isTransientError, type Document } from '@/lib/stellar'
import { downloadEncryptedPayload } from '@/lib/ipfs'
import { decryptFile, decodePayload } from '@/lib/encryption'
import { unwrapAesKey } from '@/lib/ecies'
import { loadPrivateKey } from '@/lib/doctorkey'
import { saveDoctorRecord } from '@/lib/doctorstore'
import { t, type Lang } from '@/lib/i18n'
import { RecordContent } from './RecordContent'

type AccessStatus =
  | { phase: 'verifying' }
  | { phase: 'invalid'; reason: string }
  | { phase: 'network' }
  | { phase: 'decrypting' }
  | { phase: 'ready'; data: ArrayBuffer; doc: Document }

interface DoctorAccessProps {
  tokenId: string
  doctorPublicKey: string
  lang: Lang
}

export function DoctorAccess({ tokenId, doctorPublicKey, lang }: DoctorAccessProps) {
  const [status, setStatus] = useState<AccessStatus>({ phase: 'verifying' })

  useEffect(() => { verify() }, [tokenId, doctorPublicKey])

  async function verify() {
    setStatus({ phase: 'verifying' })
    try {
      const tokenInfo = await getTokenInfo(tokenId)

      if (!tokenInfo) {
        setStatus({ phase: 'invalid', reason: t('doctor', 'reason_token_not_found', lang) })
        return
      }

      if (tokenInfo.doctor !== doctorPublicKey) {
        setStatus({
          phase: 'invalid',
          reason: `${t('doctor', 'wrong_wallet_a', lang)} ${tokenInfo.doctor.slice(0, 6)}…${tokenInfo.doctor.slice(-4)}. ${t('doctor', 'wrong_wallet_b', lang)} ${doctorPublicKey.slice(0, 6)}…${doctorPublicKey.slice(-4)}.`,
        })
        return
      }

      const valid = await verifyAccess(tokenId, doctorPublicKey)
      if (!valid) {
        setStatus({ phase: 'invalid', reason: t('doctor', 'reason_expired', lang) })
        return
      }

      await decrypt(tokenInfo)
    } catch (e) {
      if (isTransientError(e)) { setStatus({ phase: 'network' }); return }
      setStatus({ phase: 'invalid', reason: e instanceof Error ? e.message : t('doctor', 'reason_verification_failed', lang) })
    }
  }

  async function decrypt(tokenInfo: { documentId: string; patient: string }) {
    setStatus({ phase: 'decrypting' })
    try {
      const doc = await getDocument(tokenInfo.documentId)
      if (!doc) throw new Error(t('doctor', 'reason_doc_not_found', lang))

      const encryptedKeyBytes = await getEncryptedKey(tokenId)
      if (!encryptedKeyBytes || encryptedKeyBytes.length === 0) {
        throw new Error(t('doctor', 'reason_key_not_found', lang))
      }

      const priv = await loadPrivateKey(doctorPublicKey)
      const aesKey = await unwrapAesKey(encryptedKeyBytes, priv)

      const payload = await downloadEncryptedPayload(doc.cid)
      const { ciphertext, iv } = decodePayload(payload)
      const plaintext = await decryptFile(ciphertext, iv, aesKey)

      await logAccess(tokenId, tokenInfo.patient)

      saveDoctorRecord({
        tokenId,
        documentId: tokenInfo.documentId,
        cid: doc.cid,
        docType: doc.docType,
        patientAddress: tokenInfo.patient,
        createdAt: doc.createdAt,
        accessedAt: Math.floor(Date.now() / 1000),
      })

      setStatus({ phase: 'ready', data: plaintext, doc })
    } catch (e) {
      if (isTransientError(e)) { setStatus({ phase: 'network' }); return }
      setStatus({ phase: 'invalid', reason: e instanceof Error ? e.message : t('doctor', 'reason_decryption_failed', lang) })
    }
  }

  if (status.phase === 'verifying' || status.phase === 'decrypting') {
    return (
      <div className="flex flex-col items-center gap-3 px-5 py-10">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {status.phase === 'verifying' ? t('doctor', 'verifying', lang) : t('doctor', 'decrypting', lang)}
        </p>
        <Skeleton className="h-3 w-40 mt-1" />
        <Skeleton className="h-3 w-28" />
      </div>
    )
  }

  if (status.phase === 'network') {
    return (
      <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
        <div className="rounded-full bg-accent/10 p-3">
          <Wifi className="h-6 w-6 text-accent-foreground" />
        </div>
        <p className="font-medium text-sm">{t('doctor', 'network_title', lang)}</p>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
          {t('doctor', 'network_desc', lang)}
        </p>
        <Button variant="outline" size="sm" onClick={verify}>{t('doctor', 'try_again', lang)}</Button>
      </div>
    )
  }

  if (status.phase === 'invalid') {
    return (
      <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
        <div className="rounded-full bg-destructive/8 p-3">
          <ShieldX className="h-6 w-6 text-destructive" />
        </div>
        <p className="font-medium text-sm">{t('doctor', 'denied_title', lang)}</p>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">{status.reason}</p>
        <Button variant="outline" size="sm" onClick={verify}>{t('doctor', 'retry', lang)}</Button>
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
          {t('doctor', 'verified', lang)}
        </Badge>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
          {t('doctor', 'clinical_record', lang)}
        </p>
        <RecordContent data={status.data} docType={status.doc.docType} />
      </div>

      <p className="text-[10px] text-muted-foreground text-center py-0.5">
        {t('doctor', 'in_memory', lang)}
      </p>
    </div>
  )
}
