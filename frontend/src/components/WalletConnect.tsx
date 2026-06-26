import { Wallet, AlertTriangle, Loader2, LogOut, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useWallet } from '@/contexts/WalletContext'
import { cn } from '@/lib/utils'
import { useState, useRef, useEffect } from 'react'

export function WalletConnect() {
  const { state, connect, disconnect, truncate } = useWallet()
  const [open, setOpen] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleConnect() {
    setConnecting(true)
    try {
      await connect()
    } catch {
      /* user closed modal or rejected */
    } finally {
      setConnecting(false)
    }
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
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 hover:bg-muted/50 transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
          <span className="font-mono text-xs text-muted-foreground">{truncate(state.publicKey)}</span>
          <Badge className="text-[10px] bg-accent/20 text-accent-foreground border border-accent/30 hover:bg-accent/20 px-1.5 py-0">
            Testnet
          </Badge>
          <ChevronDown className={cn('h-3 w-3 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1.5 w-56 rounded-lg border border-border bg-background shadow-md z-50 overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border">
              <p className="text-xs text-muted-foreground">Connected wallet</p>
              <p className="font-mono text-xs text-foreground mt-0.5 truncate">{state.publicKey}</p>
            </div>
            <button
              onClick={() => { disconnect(); setOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-destructive hover:bg-destructive/5 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Disconnect
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <Button size="sm" onClick={handleConnect} disabled={connecting || state.status === 'idle'} className="gap-2">
      {connecting || state.status === 'idle' ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Wallet className="h-4 w-4" />
      )}
      Connect Wallet
    </Button>
  )
}
