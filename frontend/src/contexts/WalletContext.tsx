import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { isConnected, getAddress, getNetwork, requestAccess } from '@stellar/freighter-api'

export type WalletState =
  | { status: 'idle' }
  | { status: 'disconnected' }
  | { status: 'disconnected_manual' }
  | { status: 'wrong_network'; network: string }
  | { status: 'connected'; publicKey: string }

interface WalletContextValue {
  state: WalletState
  freighterInstalled: boolean | null
  connect: () => Promise<void>
  disconnect: () => void
  truncate: (key: string) => string
}

const WalletContext = createContext<WalletContextValue | null>(null)

const DISCONNECTED_KEY = 'medvault_disconnected'

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({ status: 'idle' })
  const [freighterInstalled, setFreighterInstalled] = useState<boolean | null>(null)

  const check = useCallback(async (skipGuard = false) => {
    if (!skipGuard && localStorage.getItem(DISCONNECTED_KEY) === 'true') {
      setFreighterInstalled(true)
      setState({ status: 'disconnected_manual' })
      return
    }

    try {
      const conn = await isConnected()
      if (!conn.isConnected) {
        setFreighterInstalled(false)
        setState({ status: 'disconnected' })
        return
      }
      setFreighterInstalled(true)

      const net = await getNetwork()
      if (net.network !== 'TESTNET') {
        setState({ status: 'wrong_network', network: net.network })
        return
      }

      const addr = await getAddress()
      if (addr.address) {
        setState({ status: 'connected', publicKey: addr.address })
      } else {
        setState({ status: 'disconnected' })
      }
    } catch {
      setFreighterInstalled(false)
      setState({ status: 'disconnected' })
    }
  }, [])

  useEffect(() => { check() }, [check])

  async function connect() {
    localStorage.removeItem(DISCONNECTED_KEY)
    await requestAccess()
    await check(true)
  }

  function disconnect() {
    localStorage.setItem(DISCONNECTED_KEY, 'true')
    setState({ status: 'disconnected_manual' })
  }

  function truncate(key: string) {
    return `${key.slice(0, 4)}...${key.slice(-4)}`
  }

  return (
    <WalletContext.Provider value={{ state, freighterInstalled, connect, disconnect, truncate }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider')
  return ctx
}
