import { useWallet } from '@/hooks/useWallet'
import { PatientVault } from '@/components/PatientVault'
import { WalletConnect } from '@/components/WalletConnect'
import { ShieldCheck } from 'lucide-react'

export function PatientPage() {
  const { state } = useWallet()

  if (state.status !== 'connected') {
    return (
      <div className="flex flex-col items-center gap-6 px-5 py-16 text-center">
        <div className="rounded-full bg-primary/5 p-5">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Connect your wallet</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Connect Freighter to access your medical vault
          </p>
        </div>
        <WalletConnect />
      </div>
    )
  }

  return <PatientVault publicKey={state.publicKey} />
}
