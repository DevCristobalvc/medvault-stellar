import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useWallet } from '@/contexts/WalletContext'
import { DoctorAccess } from '@/components/DoctorAccess'
import { DoctorRecords } from '@/components/DoctorRecords'
import { DocumentUpload } from '@/components/DocumentUpload'
import { DoctorKeySetup } from '@/components/DoctorKeySetup'
import { WalletConnect } from '@/components/WalletConnect'
import { Stethoscope, Upload, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { t, type Lang } from '@/lib/i18n'

type Tab = 'upload' | 'records'

interface DoctorPageProps { lang: Lang }

export function DoctorPage({ lang }: DoctorPageProps) {
  const { state } = useWallet()
  const [searchParams] = useSearchParams()
  const tokenId = searchParams.get('token')
  const [tab, setTab] = useState<Tab>('upload')

  useEffect(() => {
    if (window.location.hash.startsWith('#wk=') || window.location.hash.startsWith('#key=')) {
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])

  if (state.status !== 'connected') {
    return (
      <div className="flex flex-col items-center gap-6 px-5 py-16 text-center">
        <div className="rounded-full bg-primary/5 p-5">
          <Stethoscope className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{t('doctor', 'portal_title', lang)}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('doctor', 'portal_connect', lang)}
          </p>
        </div>
        <WalletConnect lang={lang} />
      </div>
    )
  }

  if (tokenId) {
    return (
      <div className="max-w-lg mx-auto">
        <DoctorAccess tokenId={tokenId} doctorPublicKey={state.publicKey} lang={lang} />
      </div>
    )
  }

  return (
    <div className="px-5 py-6 md:px-8 max-w-lg mx-auto flex flex-col gap-5">
      <DoctorKeySetup doctorPublicKey={state.publicKey} lang={lang} />

      <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
        {([
          { id: 'upload', label: t('doctor', 'tab_upload', lang), icon: Upload },
          { id: 'records', label: t('doctor', 'tab_records', lang), icon: FolderOpen },
        ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors',
              tab === id
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'upload' && <DocumentUpload lang={lang} />}
      {tab === 'records' && <DoctorRecords doctorPublicKey={state.publicKey} lang={lang} />}
    </div>
  )
}
