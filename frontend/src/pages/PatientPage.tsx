import { useWallet } from '@/contexts/WalletContext'
import { PatientVault } from '@/components/PatientVault'
import { WalletConnect } from '@/components/WalletConnect'
import { ShieldCheck } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'

export function PatientPage({ lang }: { lang: Lang }) {
  const { state } = useWallet()

  if (state.status !== 'connected') {
    return (
      <div className="flex flex-col items-center gap-6 px-5 py-16 text-center">
        <div className="rounded-full bg-primary/5 p-5">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{t('patient', 'connect_title', lang)}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('patient', 'connect_sub', lang)}
          </p>
        </div>
        <WalletConnect lang={lang} />
      </div>
    )
  }

  return <PatientVault publicKey={state.publicKey} lang={lang} />
}
