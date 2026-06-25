import { AlertTriangle, FileX, Clock, ShieldOff, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Separator } from '@/components/ui/separator'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { t, type Lang } from '@/lib/i18n'

interface ProblemPageProps { lang: Lang }

const STATS = [
  { key: 'stat1' },
  { key: 'stat2' },
  { key: 'stat3' },
] as const

const PROBLEMS = [
  { key: 'p1', icon: FileX },
  { key: 'p2', icon: Clock },
  { key: 'p3', icon: ShieldOff },
] as const

export function ProblemPage({ lang }: ProblemPageProps) {
  return (
    <div className="flex flex-col min-h-[calc(100dvh-64px)]">
      <section className="flex flex-col items-center text-center gap-6 px-5 pt-14 pb-10 md:pt-20 md:pb-14">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-destructive/20 bg-destructive/5 px-3 py-1 text-xs text-destructive">
          <AlertTriangle className="h-3 w-3" />
          {t('problem', 'badge', lang)}
        </div>

        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight max-w-xl leading-tight">
          {t('problem', 'headline', lang)}
        </h1>

        <p className="text-muted-foreground text-base max-w-md leading-relaxed">
          {t('problem', 'sub', lang)}
        </p>
      </section>

      <div className="px-5 md:px-8 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {STATS.map(({ key }) => (
            <div key={key} className="rounded-xl border border-border bg-card p-6 text-center">
              <p className="text-4xl font-semibold text-foreground tracking-tight">
                {t('problem', `${key}_n`, lang)}
              </p>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {t('problem', `${key}_l`, lang)}
              </p>
            </div>
          ))}
        </div>

        <Separator className="mb-10" />

        <div className="flex flex-col gap-8 mb-12">
          {PROBLEMS.map(({ key, icon: Icon }) => (
            <div key={key} className="flex gap-4">
              <div className="mt-0.5 w-8 h-8 rounded-lg border border-border flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-1">{t('problem', `${key}_title`, lang)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('problem', `${key}_desc`, lang)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Separator className="mb-10" />

        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <p className="text-base font-medium max-w-sm leading-relaxed">
            {t('problem', 'solution', lang)}
          </p>
          <Link
            to="/protocol"
            className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}
          >
            {t('protocol', 'badge', lang)}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
