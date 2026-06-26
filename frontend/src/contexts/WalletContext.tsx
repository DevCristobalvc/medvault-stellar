import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { Networks } from '@stellar/stellar-sdk'
import { openWalletModal, restoreAddress, getKitNetworkPassphrase, disconnectKit } from '@/lib/walletKit'

export type WalletState =
  | { status: 'idle' }
  | { status: 'disconnected' }
  | { status: 'wrong_network'; network: string }
  | { status: 'connected'; publicKey: string }

interface WalletContextValue {
  state: WalletState
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  truncate: (key: string) => string
}

const WalletContext = createContext<WalletContextValue | null>(null)

async function resolveState(publicKey: string): Promise<WalletState> {
  try {
    const passphrase = await getKitNetworkPassphrase()
    if (passphrase !== Networks.TESTNET) {
      return { status: 'wrong_network', network: passphrase }
    }
  } catch {
    /* some wallets cannot report network; assume the selected one */
  }
  return { status: 'connected', publicKey }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({ status: 'idle' })

  const check = useCallback(async () => {
    const address = await restoreAddress()
    if (!address) {
      setState({ status: 'disconnected' })
      return
    }
    setState(await resolveState(address))
  }, [])

  useEffect(() => { check() }, [check])

  async function connect() {
    const address = await openWalletModal()
    if (!address) return
    setState(await resolveState(address))
  }

  async function disconnect() {
    await disconnectKit()
    setState({ status: 'disconnected' })
  }

  function truncate(key: string) {
    return `${key.slice(0, 4)}...${key.slice(-4)}`
  }

  return (
    <WalletContext.Provider value={{ state, connect, disconnect, truncate }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider')
  return ctx
}
