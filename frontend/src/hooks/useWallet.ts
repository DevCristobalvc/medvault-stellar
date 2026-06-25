import { useState, useEffect, useCallback } from 'react'
import { isConnected, getAddress, getNetwork, requestAccess } from '@stellar/freighter-api'

export type WalletState =
  | { status: 'disconnected' }
  | { status: 'disconnected_manual' }
  | { status: 'wrong_network'; network: string }
  | { status: 'connected'; publicKey: string }

const DISCONNECTED_KEY = 'medvault_disconnected'

export function useWallet() {
  const [state, setState] = useState<WalletState>({ status: 'disconnected' })
  const [freighterInstalled, setFreighterInstalled] = useState<boolean | null>(null)

  const wasManuallyDisconnected = () =>
    localStorage.getItem(DISCONNECTED_KEY) === 'true'

  const check = useCallback(async (skipDisconnectGuard = false) => {
    if (!skipDisconnectGuard && wasManuallyDisconnected()) {
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

  useEffect(() => {
    check()
  }, [check])

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

  return { state, freighterInstalled, connect, disconnect, refresh: check, truncate }
}
