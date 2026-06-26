import { useRef, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ExternalLink, FileText, Video, Users, Star, ArrowRight,
  FileX, Clock, ShieldOff, ShieldCheck, Timer, ScrollText,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { buttonVariants } from '@/components/ui/button'
import { StarField } from '@/components/StarField'
import { cn } from '@/lib/utils'
import { t, type Lang } from '@/lib/i18n'

interface HackathonPageProps { lang: Lang }

const CONTRACT_ID = 'CAUUBZYILFYVHS2IYJDMXR4GUZ2LLYVWR25W7C5PXC7A5PF3QHIUWH2M'
const REPO_URL = 'https://github.com/DevCristobalvc/medvault-stellar'
const DEMO_URL = 'https://medvault-stellar.vercel.app'
const EXPLORER_URL = `https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`

// Paste the submission links here (YouTube / Drive / PDF). Empty = "Coming soon".
const DECK_URL = ''
const DEMO_VIDEO_URL = ''
const DISCOVERY_VIDEO_URL = ''

// Add news articles / studies that back the statistics. Empty = hidden.
const SOURCES: { label: string; url: string }[] = [
  // { label: 'El Tiempo — ransomware en salud', url: 'https://...' },
]

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number]

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
      transition={{ duration: 0.5, ease }}
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

function youTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/)
  return m ? m[1] : null
}

function VideoCard({ icon: Icon, title, desc, url, pending }: {
  icon: React.ElementType; title: string; desc: string; url: string; pending: string
}) {
  const id = url ? youTubeId(url) : null
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      {id ? (
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
          <iframe
            className="w-full h-full"
            src={`https://www.youtube-nocookie.com/embed/${id}`}
            title={title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="aspect-video w-full rounded-xl border border-dashed border-border bg-muted/30 flex flex-col items-center justify-center gap-2 text-center px-4">
          <Video className="h-6 w-6 text-muted-foreground/50" />
          <Badge variant="outline" className="text-xs text-muted-foreground">{pending}</Badge>
        </div>
      )}
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  )
}

function ResourceCard({ icon: Icon, title, desc, url, label, pending }: {
  icon: React.ElementType; title: string; desc: string; url: string; label: string; pending: string
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{desc}</p>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
          >
            {label}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <Badge variant="outline" className="text-xs text-muted-foreground">{pending}</Badge>
        )}
      </CardContent>
    </Card>
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

const SOLUTIONS = [
  { key: 'f1', icon: ShieldCheck },
  { key: 'f2', icon: Timer },
  { key: 'f3', icon: ScrollText },
] as const

const EVALUATION_CRITERIA = [
  { label: 'Integration depth & technical complexity', status: 'done', note: 'Soroban contract: 12 functions, 20 tests, require_auth enforcement, real Groth16 / BLS12-381 verifier (CAP-0052)' },
  { label: 'Impact on the Stellar ecosystem', status: 'done', note: 'Open Blockchain-as-a-Service protocol for medical data in LATAM' },
  { label: 'Customer discovery & validation', status: 'pending', note: '3 recorded interviews — see Demo & Interviews above' },
  { label: 'Quality of testnet deployment', status: 'done', note: `Live on Stellar Testnet · ${CONTRACT_ID.slice(0, 12)}…` },
]

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
      {children}
    </h2>
  )
}

export function HackathonPage({ lang }: HackathonPageProps) {
  const reduced = useReducedMotion()
  const pending = t('hackathon', 'pending', lang)

  return (
    <div className="flex flex-col gap-0">
      <section className="relative overflow-hidden flex flex-col items-center text-center gap-5 px-5 pt-14 pb-10 md:pt-20 md:pb-14">
        <StarField className="opacity-70" />

        <div className="relative z-10 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent-foreground">
          <Star className="h-3 w-3" />
          {t('hackathon', 'badge', lang)}
        </div>
        <h1 className="relative z-10 text-3xl md:text-4xl font-semibold tracking-tight max-w-2xl">
          {t('hackathon', 'headline', lang)}
        </h1>
        <p className="relative z-10 text-muted-foreground text-sm max-w-md leading-relaxed">
          {t('hackathon', 'sub', lang)}
        </p>
        <div className="relative z-10 flex flex-wrap justify-center gap-2">
          <Badge variant="outline">NearX</Badge>
          <Badge variant="outline">Stellar Development Foundation</Badge>
          <Badge variant="outline">Colombia</Badge>
          <Badge variant="outline">June 2026</Badge>
        </div>
      </section>

      <div className="px-5 md:px-8 max-w-4xl mx-auto w-full flex flex-col gap-12 pb-16">

        {/* Problem */}
        <section>
          <SectionTitle>{t('hackathon', 'problem_h', lang)}</SectionTitle>
          <p className="text-base font-medium leading-relaxed mb-6 max-w-2xl">
            {t('problem', 'sub', lang)}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
            {STATS.map((s) => (
              <StatCard key={s.numKey} {...s} lang={lang} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-8 text-xs text-muted-foreground">
            <span>{t('hackathon', 'stats_note', lang)}</span>
            {SOURCES.length > 0 && (
              <>
                <span aria-hidden>·</span>
                <span className="font-medium">{t('hackathon', 'sources_label', lang)}:</span>
                {SOURCES.map((s) => (
                  <a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {s.label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </>
            )}
          </div>
          <div className="flex flex-col gap-6">
            {PROBLEMS.map(({ key, icon: Icon }, i) => (
              <motion.div
                key={key}
                initial={reduced ? false : { opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: i * 0.08, ease }}
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
        </section>

        <Separator />

        {/* Solution */}
        <section>
          <SectionTitle>{t('hackathon', 'solution_h', lang)}</SectionTitle>
          <p className="text-base font-medium leading-relaxed mb-6 max-w-2xl">
            {t('problem', 'solution', lang)}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SOLUTIONS.map(({ key, icon: Icon }, i) => (
              <motion.div
                key={key}
                initial={reduced ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: i * 0.08, ease }}
                className="rounded-xl border border-border bg-card p-5"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Icon className="h-4.5 w-4.5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold mb-1">{t('home', `${key}_title`, lang)}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('home', `${key}_desc`, lang)}
                </p>
              </motion.div>
            ))}
          </div>
          <div className="mt-6">
            <Link to="/protocol" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}>
              {t('hackathon', 'deep_dive', lang)}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        <Separator />

        {/* Demo & Interviews */}
        <section>
          <SectionTitle>{t('hackathon', 'videos_h', lang)}</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <VideoCard
              icon={Video}
              title={t('hackathon', 'video_demo', lang)}
              desc={t('hackathon', 'video_demo_desc', lang)}
              url={DEMO_VIDEO_URL}
              pending={pending}
            />
            <VideoCard
              icon={Users}
              title={t('hackathon', 'video_interviews', lang)}
              desc={t('hackathon', 'video_interviews_desc', lang)}
              url={DISCOVERY_VIDEO_URL}
              pending={pending}
            />
          </div>
        </section>

        <Separator />

        {/* Submission Materials */}
        <section>
          <SectionTitle>{t('hackathon', 'materials_h', lang)}</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ResourceCard
              icon={FileText}
              title={t('hackathon', 'deck', lang)}
              desc="Pitch deck — problem, solution, architecture, and business model."
              url={DECK_URL}
              label="Open deck"
              pending={pending}
            />
            <ResourceCard
              icon={ExternalLink}
              title={t('hackathon', 'repo', lang)}
              desc="Full source code — Soroban contract, React frontend, integration tests."
              url={REPO_URL}
              label="View on GitHub"
              pending={pending}
            />
            <ResourceCard
              icon={ExternalLink}
              title={t('hackathon', 'contract', lang)}
              desc={`Contract ${CONTRACT_ID.slice(0, 20)}… deployed on Stellar Testnet.`}
              url={EXPLORER_URL}
              label="View on Stellar Expert"
              pending={pending}
            />
            <ResourceCard
              icon={Users}
              title={t('hackathon', 'discovery', lang)}
              desc={t('hackathon', 'discovery_desc', lang)}
              url={DISCOVERY_VIDEO_URL}
              label="Watch interviews"
              pending={pending}
            />
          </div>
        </section>

        <Separator />

        {/* Evaluation */}
        <section>
          <SectionTitle>{t('hackathon', 'eval_h', lang)}</SectionTitle>
          <div className="flex flex-col gap-2">
            {EVALUATION_CRITERIA.map((c) => (
              <div key={c.label} className="flex items-start gap-3 rounded-lg border border-border px-4 py-3">
                <span className={`mt-0.5 text-base leading-none ${c.status === 'done' ? 'text-green-500' : 'text-amber-400'}`}>
                  {c.status === 'done' ? '✓' : '○'}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{c.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        {/* Live demo */}
        <section>
          <SectionTitle>{t('hackathon', 'demo_h', lang)}</SectionTitle>
          <div className="rounded-xl border border-border bg-muted/40 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">MedVault Frontend</p>
              <p className="font-mono text-xs text-muted-foreground mt-0.5 break-all">{DEMO_URL}</p>
            </div>
            <a
              href={DEMO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline shrink-0"
            >
              Open app
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </section>
      </div>
    </div>
  )
}
