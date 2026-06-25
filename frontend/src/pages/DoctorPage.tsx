import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useWallet } from '@/contexts/WalletContext'
import { DoctorAccess } from '@/components/DoctorAccess'
import { DoctorRecords } from '@/components/DoctorRecords'
import { DocumentUpload } from '@/components/DocumentUpload'
import { WalletConnect } from '@/components/WalletConnect'
import { Stethoscope, Upload, FolderOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'upload' | 'records'

function readKeyFromHash(): string | null {
  const hash = window.location.hash
  if (!hash.startsWith('#key=')) return null
  try {
    return decodeURIComponent(hash.slice(5))
  } catch {
    return null
  }
}

export function DoctorPage() {
  const { state } = useWallet()
  const [searchParams] = useSearchParams()
  const tokenId = searchParams.get('token')
  const [encryptionKey] = useState<string | null>(readKeyFromHash)
  const [tab, setTab] = useState<Tab>('upload')

  if (state.status !== 'connected') {
    return (
      <div className="flex flex-col items-center gap-6 px-5 py-16 text-center">
        <div className="rounded-full bg-primary/5 p-5">
          <Stethoscope className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Doctor portal</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your Freighter wallet to continue
          </p>
        </div>
        <WalletConnect />
      </div>
    )
  }

  if (tokenId) {
    return (
      <div className="max-w-lg mx-auto">
        <DoctorAccess
          tokenId={tokenId}
          doctorPublicKey={state.publicKey}
          encryptionKey={encryptionKey}
        />
      </div>
    )
  }

  return (
    <div className="px-5 py-6 md:px-8 max-w-lg mx-auto flex flex-col gap-5">
      <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
        {([
          { id: 'upload', label: 'New Record', icon: Upload },
          { id: 'records', label: 'Shared with me', icon: FolderOpen },
        ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors',
              tab === id
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'upload' && <DocumentUpload />}
      {tab === 'records' && <DoctorRecords doctorPublicKey={state.publicKey} />}
    </div>
  )
}
