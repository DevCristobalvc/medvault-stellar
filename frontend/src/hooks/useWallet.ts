import { useState, useEffect, useCallback } from 'react'
import { isConnected, getAddress, getNetwork, requestAccess } from '@stellar/freighter-api'

export type WalletState =
  | { status: 'disconnected' }
  | { status: 'wrong_network'; network: string }
  | { status: 'connected'; publicKey: string }

export function useWallet() {
  const [state, setState] = useState<WalletState>({ status: 'disconnected' })
  const [freighterInstalled, setFreighterInstalled] = useState<boolean | null>(null)

  const check = useCallback(async () => {
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

  useEffect(() => {
    check()
  }, [check])

  async function connect() {
    await requestAccess()
    await check()
  }

  function truncate(key: string) {
    return `${key.slice(0, 4)}...${key.slice(-4)}`
  }

  return { state, freighterInstalled, connect, refresh: check, truncate }
}
