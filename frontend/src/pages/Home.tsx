import { ShieldCheck, FileKey, Activity } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Sovereign records',
    description: 'Your records are encrypted before leaving your device. Only you decide who reads them.',
  },
  {
    icon: FileKey,
    title: 'Time-bound access',
    description: 'Generate a QR code that grants access for 1 hour, 24 hours, or 7 days — then it expires automatically.',
  },
  {
    icon: Activity,
    title: 'Immutable audit log',
    description: 'Every access is recorded on Stellar. You always know who read your records and when.',
  },
]

export function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100dvh-64px)]">
      <section className="flex flex-col items-center text-center gap-6 px-5 pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background-soft px-3 py-1 text-xs text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          Built on Stellar Testnet
        </div>

        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight max-w-xl leading-tight">
          Your body,{' '}
          <span className="text-primary">your records</span>
        </h1>

        <p className="text-muted-foreground text-base max-w-md leading-relaxed">
          MedVault gives patients full control over their medical history.
          Encrypted, on-chain access tokens. No middlemen.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none sm:w-auto">
          <Link to="/patient" className={cn(buttonVariants({ size: 'lg' }), 'w-full sm:w-auto')}>
            Open my Vault
          </Link>
          <Link
            to="/doctor/upload"
            className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'w-full sm:w-auto')}
          >
            Upload a Record
          </Link>
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-6 px-5 py-10 md:px-8 md:grid md:grid-cols-3 md:gap-8">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <div key={title} className="flex flex-col gap-2">
            <div className="w-8 h-8 rounded-lg border border-border flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
