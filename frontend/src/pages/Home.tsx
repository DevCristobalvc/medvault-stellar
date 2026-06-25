import { ShieldCheck, FileKey, Activity } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { t, type Lang } from '@/lib/i18n'

interface HomeProps { lang: Lang }

const FEATURES = [
  { icon: ShieldCheck, titleKey: 'f1_title', descKey: 'f1_desc' },
  { icon: FileKey,     titleKey: 'f2_title', descKey: 'f2_desc' },
  { icon: Activity,    titleKey: 'f3_title', descKey: 'f3_desc' },
] as const

export function Home({ lang }: HomeProps) {
  return (
    <div className="flex flex-col min-h-[calc(100dvh-64px)]">
      <section className="flex flex-col items-center text-center gap-6 px-5 pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background-soft px-3 py-1 text-xs text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          {t('home', 'badge', lang)}
        </div>

        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight max-w-xl leading-tight">
          {t('home', 'headline', lang).split(', ').map((part, i) => (
            i === 1
              ? <span key={i}>, <span className="text-primary">{part}</span></span>
              : <span key={i}>{part}</span>
          ))}
        </h1>

        <p className="text-muted-foreground text-base max-w-md leading-relaxed">
          {t('home', 'sub', lang)}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none sm:w-auto">
          <Link to="/patient" className={cn(buttonVariants({ size: 'lg' }), 'w-full sm:w-auto')}>
            {t('home', 'cta_vault', lang)}
          </Link>
          <Link
            to="/doctor/upload"
            className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'w-full sm:w-auto')}
          >
            {t('home', 'cta_upload', lang)}
          </Link>
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-6 px-5 py-10 md:px-8 md:grid md:grid-cols-3 md:gap-8">
        {FEATURES.map(({ icon: Icon, titleKey, descKey }) => (
          <div key={titleKey} className="flex flex-col gap-2">
            <div className="w-8 h-8 rounded-lg border border-border flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold">{t('home', titleKey, lang)}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{t('home', descKey, lang)}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
