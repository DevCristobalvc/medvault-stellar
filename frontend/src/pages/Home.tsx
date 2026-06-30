import { useEffect, useRef } from 'react'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ParticleBackdrop } from '@/components/ParticleBackdrop'
import { cn } from '@/lib/utils'
import { t, type Lang } from '@/lib/i18n'

interface HomeProps { lang: Lang }

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1)

const btnPrimary =
  'group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 font-mono text-[13px] uppercase tracking-wider text-primary-foreground shadow-[0_6px_20px_-8px_rgba(27,79,216,0.6)] ring-1 ring-inset ring-white/25 transition hover:-translate-y-0.5 hover:shadow-[0_10px_26px_-8px_rgba(27,79,216,0.7)]'

const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-full border border-border/70 bg-white/75 px-6 py-2.5 font-mono text-[13px] uppercase tracking-wider text-foreground shadow-sm backdrop-blur-md transition hover:border-primary/40 hover:text-primary'

export function Home({ lang }: HomeProps) {
  const root = useRef<HTMLDivElement>(null)
  const progress = useRef(0)
  const m = (k: string) => t('home', k, lang)

  useEffect(() => {
    const el = root.current
    const onScroll = () => {
      const span = window.innerHeight * 2.2
      const p = clamp01(window.scrollY / span)
      progress.current = p
      if (!el) return
      const seg = p * 2
      el.style.setProperty('--p', String(p))
      el.style.setProperty('--oa', String(clamp01(1 - seg / 0.85)))
      el.style.setProperty('--ob', String(clamp01(1 - Math.abs(seg - 1) / 0.6)))
      el.style.setProperty('--oc', String(clamp01((seg - 1.25) / 0.6)))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const words = m('headline').split(' ')

  return (
    <div
      ref={root}
      className="relative"
      style={{
        ['--p' as string]: 0,
        ['--oa' as string]: 1,
        ['--ob' as string]: 0,
        ['--oc' as string]: 0,
      }}
    >
      <ParticleBackdrop progress={progress} />

      <div className="pointer-events-none relative z-10">
        <section className="flex min-h-[100svh] flex-col items-center justify-center gap-7 px-5 text-center">
          <div className="flex flex-col items-center gap-6" style={{ opacity: 'var(--oa)' }}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/70 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#E0A200]" />
              {m('badge')}
            </span>

            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-foreground md:text-6xl">
              {words.map((word, i) => (
                <span
                  key={i}
                  className={cn(
                    'mr-[0.25em] inline-block',
                    i === words.length - 1 &&
                      'bg-gradient-to-r from-[#1B4FD8] to-[#C08A00] bg-clip-text text-transparent'
                  )}
                >
                  {word}
                </span>
              ))}
            </h1>

            <p className="max-w-md text-base leading-relaxed text-muted-foreground">{m('f1_desc')}</p>

            <div className="pointer-events-auto flex w-full max-w-xs flex-col gap-3 sm:w-auto sm:flex-row">
              <Link to="/patient" className={cn(btnPrimary, 'w-full sm:w-auto')}>
                {m('cta_vault')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link to="/doctor/upload" className={cn(btnGhost, 'w-full sm:w-auto')}>
                {m('cta_upload')}
              </Link>
            </div>
          </div>

          <div
            className="absolute bottom-8 flex flex-col items-center gap-1 text-muted-foreground"
            style={{ opacity: 'var(--oa)' }}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.25em]">{m('journey_h')}</span>
            <ChevronDown className="h-4 w-4 animate-bounce" />
          </div>
        </section>

        <section className="flex min-h-[100svh] items-center justify-center px-5 text-center">
          <div className="flex max-w-md flex-col items-center gap-4" style={{ opacity: 'var(--ob)' }}>
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
              <span className="text-[#C08A00]">[ 01 ]</span> {m('f2_title')}
            </span>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-4xl">{m('f2_title')}</h2>
            <p className="text-base leading-relaxed text-muted-foreground">{m('f2_desc')}</p>
          </div>
        </section>

        <section className="flex min-h-[100svh] items-center justify-center px-5 text-center">
          <div className="flex max-w-md flex-col items-center gap-5" style={{ opacity: 'var(--oc)' }}>
            <span className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
              <span className="text-[#C08A00]">[ 02 ]</span> {m('f3_title')}
            </span>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-4xl">{m('f3_title')}</h2>
            <p className="text-base leading-relaxed text-muted-foreground">{m('f3_desc')}</p>

            <div className="pointer-events-auto mt-2 flex flex-col items-center gap-4">
              <Link to="/patient" className={btnPrimary}>
                {m('cta_vault')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/hackathon"
                className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
              >
                {t('hackathon', 'badge', lang)}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
