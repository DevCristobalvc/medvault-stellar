import { ExternalLink, FileText, Video, Users, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { t, type Lang } from '@/lib/i18n'

interface HackathonPageProps { lang: Lang }

const CONTRACT_ID = 'CDBZA4VIU4CZR5USUGY7QFATH5ZO5DBPAWNMPJU2D5RRXCLRCXZDVFJK'
const REPO_URL = 'https://github.com/DevCristobalvc/medvault-stellar'
const DEMO_URL = 'https://frontend-eight-virid-j7gyqph2tp.vercel.app'
const EXPLORER_URL = `https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`

const DECK_URL = ''
const VIDEO_URL = ''
const DISCOVERY_URL = ''

interface ResourceCardProps {
  icon: React.ElementType
  title: string
  desc: string
  url: string
  label: string
  pending: string
}

function ResourceCard({ icon: Icon, title, desc, url, label, pending }: ResourceCardProps) {
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
          <Badge variant="outline" className="text-xs text-muted-foreground">
            {pending}
          </Badge>
        )}
      </CardContent>
    </Card>
  )
}

const EVALUATION_CRITERIA = [
  { label: 'Integration depth & technical complexity', status: 'done', note: 'Soroban contract with 9 functions, 11 tests' },
  { label: 'Impact on the Stellar ecosystem', status: 'done', note: 'Open BaaS protocol for medical data in LATAM' },
  { label: 'Customer discovery & validation', status: 'pending', note: '3 recorded interviews required' },
  { label: 'Quality of testnet deployment', status: 'done', note: `Contract ${CONTRACT_ID.slice(0, 12)}…` },
]

export function HackathonPage({ lang }: HackathonPageProps) {
  const pending = t('hackathon', 'pending', lang)

  return (
    <div className="flex flex-col gap-0">
      <section className="flex flex-col items-center text-center gap-5 px-5 pt-14 pb-10 md:pt-20 md:pb-14">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent-foreground">
          <Star className="h-3 w-3" />
          {t('hackathon', 'badge', lang)}
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          {t('hackathon', 'headline', lang)}
        </h1>
        <p className="text-muted-foreground text-sm max-w-md leading-relaxed">
          {t('hackathon', 'sub', lang)}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Badge variant="outline">NearX</Badge>
          <Badge variant="outline">Stellar Development Foundation</Badge>
          <Badge variant="outline">Colombia</Badge>
          <Badge variant="outline">June 2026</Badge>
        </div>
      </section>

      <div className="px-5 md:px-8 max-w-4xl mx-auto w-full flex flex-col gap-10 pb-16">

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            {t('hackathon', 'resources', lang)}
          </h2>
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
              icon={Video}
              title={t('hackathon', 'video', lang)}
              desc="2-minute walkthrough of the full patient and doctor flow."
              url={VIDEO_URL}
              label="Watch demo"
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
              url={DISCOVERY_URL}
              label="Watch interviews"
              pending={pending}
            />
          </div>
        </section>

        <Separator />

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Evaluation Criteria
          </h2>
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

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
            Live Demo
          </h2>
          <div className="rounded-xl border border-border bg-muted/40 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">MedVault Frontend</p>
              <p className="font-mono text-xs text-muted-foreground mt-0.5">{DEMO_URL}</p>
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
