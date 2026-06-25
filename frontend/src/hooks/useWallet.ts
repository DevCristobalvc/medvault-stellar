import { useState, useEffect, useCallback } from 'react'
import { isConnected, getAddress, getNetwork, requestAccess } from '@stellar/freighter-api'

export type WalletState =
  | { status: 'disconnected' }
  | { status: 'wrong_network'; network: string }
  | { status: 'connected'; publicKey: string }

const DISCONNECTED_KEY = 'medvault_disconnected'

export function useWallet() {
  const [state, setState] = useState<WalletState>({ status: 'disconnected' })
  const [freighterInstalled, setFreighterInstalled] = useState<boolean | null>(null)
  const [userDisconnected, setUserDisconnected] = useState(
    () => localStorage.getItem(DISCONNECTED_KEY) === 'true'
  )

  const check = useCallback(async () => {
    if (localStorage.getItem(DISCONNECTED_KEY) === 'true') {
      setFreighterInstalled(true)
      setState({ status: 'disconnected' })
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
    setUserDisconnected(false)
    await requestAccess()
    await check()
  }

  function disconnect() {
    localStorage.setItem(DISCONNECTED_KEY, 'true')
    setUserDisconnected(true)
    setState({ status: 'disconnected' })
  }

  function truncate(key: string) {
    return `${key.slice(0, 4)}...${key.slice(-4)}`
  }

  return { state, freighterInstalled, userDisconnected, connect, disconnect, refresh: check, truncate }
}
