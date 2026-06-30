import { ArrowRight, Fingerprint } from 'lucide-react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { buttonVariants } from '@/components/ui/button'
import { StarField } from '@/components/StarField'
import { Hero3D } from '@/components/Hero3D'
import { MermaidDiagram } from '@/components/MermaidDiagram'
import { cn } from '@/lib/utils'
import { t, type Lang } from '@/lib/i18n'

interface HomeProps { lang: Lang }

function journeyChart(lang: Lang): string {
  const m = (k: string) => t('home', k, lang)
  return `sequenceDiagram
  participant P as ${m('journey_patient')}
  participant S as ${m('journey_stellar')}
  participant D as ${m('journey_doctor')}
  D->>S: ${m('journey_s1')}
  Note over D,S: ${m('journey_note')}
  P->>D: ${m('journey_s2')}
  D->>S: ${m('journey_s3')}
  Note over D,S: ${m('journey_zk')}
  S-->>D: ${m('journey_s4')}
  D->>D: ${m('journey_s5')}
  S-->>P: ${m('journey_s6')}`
}

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

const stagger: Variants = {
  visible: { transition: { staggerChildren: 0.07 } },
}

const wordVariant: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
}

const fadeUp = (delay = 0): Variants => ({
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay, ease } },
})


export function Home({ lang }: HomeProps) {
  const reduced = useReducedMotion()

  const badge   = t('home', 'badge', lang)
  const headRaw = t('home', 'headline', lang)
  const words   = headRaw.split(' ')

  return (
    <div className="flex flex-col min-h-[calc(100dvh-64px)] overflow-hidden">

      <section className="relative flex flex-col items-center text-center gap-6 px-5 pt-16 pb-12 md:pt-24 md:pb-16">

        <StarField className="opacity-70" />

        {!reduced && (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(27,79,216,0.12) 0%, transparent 70%)',
                filter: 'blur(40px)',
              }}
            />
            <motion.div
              animate={{ opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="pointer-events-none absolute top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(245,190,0,0.08) 0%, transparent 70%)',
                filter: 'blur(24px)',
              }}
            />
          </>
        )}

        <Hero3D />

        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="relative z-10 inline-flex items-center gap-1.5 rounded-full border border-border bg-background-soft px-3 py-1 text-xs text-muted-foreground"
        >
          <motion.span
            animate={reduced ? {} : { opacity: [1, 0.4, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-1.5 h-1.5 rounded-full bg-primary"
          />
          {badge}
        </motion.div>

        <motion.h1
          variants={reduced ? undefined : stagger}
          initial="hidden"
          animate="visible"
          className="relative z-10 text-3xl md:text-5xl font-semibold tracking-tight max-w-xl leading-tight"
        >
          {words.map((word, i) => {
            const isLast = i === words.length - 1
            return (
              <motion.span
                key={i}
                variants={reduced ? undefined : wordVariant}
                className={cn('inline-block mr-[0.25em]', isLast && 'text-primary')}
              >
                {word}
              </motion.span>
            )
          })}
        </motion.h1>

        <motion.p
          variants={reduced ? undefined : fadeUp(0.5)}
          initial="hidden"
          animate="visible"
          className="relative z-10 text-muted-foreground text-base max-w-md leading-relaxed"
        >
          {t('home', 'sub', lang)}
        </motion.p>

        <motion.div
          variants={reduced ? undefined : fadeUp(0.7)}
          initial="hidden"
          animate="visible"
          className="relative z-10 flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none sm:w-auto"
        >
          <Link to="/patient" className={cn(buttonVariants({ size: 'lg' }), 'w-full sm:w-auto gap-2')}>
            {t('home', 'cta_vault', lang)}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/doctor/upload"
            className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'w-full sm:w-auto')}
          >
            {t('home', 'cta_upload', lang)}
          </Link>
        </motion.div>
      </section>

      <motion.section
        initial={reduced ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.5, ease }}
        className="relative z-10 px-5 pb-12 w-full max-w-2xl mx-auto"
      >
        <div className="text-center mb-5">
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight">
            {t('home', 'journey_h', lang)}
          </h2>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-md mx-auto leading-relaxed">
            {t('home', 'journey_sub', lang)}
          </p>
        </div>
        <MermaidDiagram chart={journeyChart(lang)} id={`journey-${lang}`} />
        <p className="text-center text-sm font-medium text-primary mt-4 max-w-md mx-auto">
          {t('home', 'journey_tagline', lang)}
        </p>
        <Link
          to="/protocol"
          className="mt-5 flex items-start gap-2.5 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 max-w-lg mx-auto transition-colors hover:bg-accent/10"
        >
          <Fingerprint className="h-4 w-4 text-accent-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('home', 'zk_line', lang)}
          </p>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5 ml-auto" />
        </Link>
      </motion.section>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="px-5 pb-12 flex justify-center"
      >
        <Link to="/hackathon" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}>
          {t('hackathon', 'badge', lang)}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </motion.div>
    </div>
  )
}
