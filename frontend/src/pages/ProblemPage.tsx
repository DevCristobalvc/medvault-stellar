import { useRef, useEffect, useState } from 'react'
import { AlertTriangle, FileX, Clock, ShieldOff, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Separator } from '@/components/ui/separator'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { t, type Lang } from '@/lib/i18n'

interface ProblemPageProps { lang: Lang }

function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const start = performance.now()
        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          setValue(Math.round(eased * target))
          if (progress < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }
    }, { threshold: 0.5 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [target, duration])

  return { value, ref }
}

function StatCard({ numKey, labelKey, lang }: { numKey: string; labelKey: string; lang: Lang }) {
  const raw = t('problem', numKey, lang)
  const numericTarget = parseInt(raw.replace('%', ''), 10)
  const { value, ref } = useCountUp(numericTarget)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-xl border border-border bg-card p-6 text-center"
    >
      <p className="text-4xl font-semibold text-foreground tracking-tight">
        <span ref={ref}>{value}</span>%
      </p>
      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
        {t('problem', labelKey, lang)}
      </p>
    </motion.div>
  )
}

const STATS = [
  { numKey: 'stat1_n', labelKey: 'stat1_l' },
  { numKey: 'stat2_n', labelKey: 'stat2_l' },
  { numKey: 'stat3_n', labelKey: 'stat3_l' },
]

const PROBLEMS = [
  { key: 'p1', icon: FileX },
  { key: 'p2', icon: Clock },
  { key: 'p3', icon: ShieldOff },
] as const

export function ProblemPage({ lang }: ProblemPageProps) {
  const reduced = useReducedMotion()

  return (
    <div className="flex flex-col min-h-[calc(100dvh-64px)] overflow-hidden">
      <section className="relative flex flex-col items-center text-center gap-6 px-5 pt-14 pb-10 md:pt-20 md:pb-14">
        {!reduced && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(220,38,38,0.07) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />
        )}

        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-1.5 rounded-full border border-destructive/20 bg-destructive/5 px-3 py-1 text-xs text-destructive"
        >
          <AlertTriangle className="h-3 w-3" />
          {t('problem', 'badge', lang)}
        </motion.div>

        <motion.h1
          initial={reduced ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="text-3xl md:text-5xl font-semibold tracking-tight max-w-xl leading-tight"
        >
          {t('problem', 'headline', lang)}
        </motion.h1>

        <motion.p
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="text-muted-foreground text-base max-w-md leading-relaxed"
        >
          {t('problem', 'sub', lang)}
        </motion.p>
      </section>

      <div className="px-5 md:px-8 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {STATS.map((s) => (
            <StatCard key={s.numKey} {...s} lang={lang} />
          ))}
        </div>

        <Separator className="mb-10" />

        <div className="flex flex-col gap-8 mb-12">
          {PROBLEMS.map(({ key, icon: Icon }, i) => (
            <motion.div
              key={key}
              initial={reduced ? false : { opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="flex gap-4"
            >
              <div className="mt-0.5 w-8 h-8 rounded-lg border border-border flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-1">{t('problem', `${key}_title`, lang)}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t('problem', `${key}_desc`, lang)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <Separator className="mb-10" />

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center gap-4 py-10 text-center"
        >
          <p className="text-base font-medium max-w-sm leading-relaxed">
            {t('problem', 'solution', lang)}
          </p>
          <Link to="/protocol" className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}>
            {t('protocol', 'badge', lang)}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </div>
  )
}
