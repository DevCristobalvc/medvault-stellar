import { useEffect, useState } from 'react'
import { ShieldCheck, KeyRound, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { isKeyPublished, publishKeypair } from '@/lib/doctorkey'
import { t, type Lang } from '@/lib/i18n'

type State = 'checking' | 'missing' | 'publishing' | 'ready' | 'error'

interface DoctorKeySetupProps {
  doctorPublicKey: string
  lang: Lang
}

export function DoctorKeySetup({ doctorPublicKey, lang }: DoctorKeySetupProps) {
  const [state, setState] = useState<State>('checking')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setState('checking')
    isKeyPublished(doctorPublicKey)
      .then((ok) => active && setState(ok ? 'ready' : 'missing'))
      .catch(() => active && setState('missing'))
    return () => {
      active = false
    }
  }, [doctorPublicKey])

  async function publish() {
    setState('publishing')
    setError(null)
    try {
      await publishKeypair(doctorPublicKey)
      setState('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('doctor', 'enable_error', lang))
      setState('error')
    }
  }

  if (state === 'checking' || state === 'ready') {
    return null
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col gap-2.5">
      <div className="flex items-start gap-2.5">
        <KeyRound className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-800">{t('doctor', 'enable_title', lang)}</p>
          <p className="text-xs text-amber-700 mt-0.5">
            {t('doctor', 'enable_desc', lang)}
          </p>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button size="sm" className="w-full gap-1.5" disabled={state === 'publishing'} onClick={publish}>
        {state === 'publishing' ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t('doctor', 'enable_publishing', lang)}
          </>
        ) : (
          <>
            <ShieldCheck className="h-3.5 w-3.5" />
            {t('doctor', 'enable_cta', lang)}
          </>
        )}
      </Button>
    </div>
  )
}
