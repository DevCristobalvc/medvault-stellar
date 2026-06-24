import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useWallet } from '@/hooks/useWallet'
import { DoctorAccess } from '@/components/DoctorAccess'
import { DocumentUpload } from '@/components/DocumentUpload'
import { WalletConnect } from '@/components/WalletConnect'
import { Stethoscope } from 'lucide-react'

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

  useEffect(() => {
    if (window.location.hash.startsWith('#key=')) {
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])

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
      <div className="flex flex-col gap-4 px-5 py-6 md:px-8 max-w-lg mx-auto">
        <DoctorAccess
          tokenId={tokenId}
          doctorPublicKey={state.publicKey}
          encryptionKey={encryptionKey}
        />
      </div>
    )
  }

  return (
    <div className="px-5 py-6 md:px-8 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold tracking-tight mb-6">New Record</h1>
      <DocumentUpload />
    </div>
  )
}
