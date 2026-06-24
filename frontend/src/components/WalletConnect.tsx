import { Wallet, AlertTriangle, Loader2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useWallet } from '@/hooks/useWallet'
import { cn } from '@/lib/utils'

export function WalletConnect() {
  const { state, freighterInstalled, connect, truncate } = useWallet()

  if (freighterInstalled === false) {
    return (
      <a
        href="https://freighter.app"
        target="_blank"
        rel="noreferrer"
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
      >
        <Wallet className="h-4 w-4" />
        Install Freighter
      </a>
    )
  }

  if (state.status === 'wrong_network') {
    return (
      <Badge variant="destructive" className="gap-1 py-1.5 px-3 text-xs font-medium cursor-default">
        <AlertTriangle className="h-3 w-3" />
        Switch to Testnet
      </Badge>
    )
  }

  if (state.status === 'connected') {
    return (
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        <span className="font-mono text-xs text-muted-foreground">{truncate(state.publicKey)}</span>
        <Badge className="text-xs bg-accent/20 text-accent-foreground border border-accent/30 hover:bg-accent/20">
          Testnet
        </Badge>
      </div>
    )
  }

  return (
    <Button size="sm" onClick={connect} className="gap-2">
      {freighterInstalled === null ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Wallet className="h-4 w-4" />
      )}
      Connect Wallet
    </Button>
  )
}
