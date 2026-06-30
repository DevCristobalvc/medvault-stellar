import type { ModuleInterface } from '@creit.tech/stellar-wallets-kit'
import { NETWORK_PASSPHRASE, IS_MAINNET } from '@/lib/network'

type KitClass = typeof import('@creit.tech/stellar-wallets-kit').StellarWalletsKit

const SELECTED_KEY = 'medvault_wallet_id'
const WC_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim()

let initPromise: Promise<void> | null = null
let Kit: KitClass | null = null
let currentAddress: string | null = null

async function buildModules(): Promise<ModuleInterface[]> {
  const [
    { FreighterModule },
    { xBullModule },
    { AlbedoModule },
    { RabetModule },
    { HanaModule },
    { LobstrModule },
  ] = await Promise.all([
    import('@creit.tech/stellar-wallets-kit/modules/freighter'),
    import('@creit.tech/stellar-wallets-kit/modules/xbull'),
    import('@creit.tech/stellar-wallets-kit/modules/albedo'),
    import('@creit.tech/stellar-wallets-kit/modules/rabet'),
    import('@creit.tech/stellar-wallets-kit/modules/hana'),
    import('@creit.tech/stellar-wallets-kit/modules/lobstr'),
  ])

  const modules: ModuleInterface[] = [
    new FreighterModule(),
    new xBullModule(),
    new AlbedoModule(),
    new RabetModule(),
    new HanaModule(),
    new LobstrModule(),
  ]

  if (WC_PROJECT_ID) {
    const { WalletConnectModule, WalletConnectTargetChain } = await import(
      '@creit.tech/stellar-wallets-kit/modules/wallet-connect'
    )
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://medvault.app'
    modules.push(
      new WalletConnectModule({
        projectId: WC_PROJECT_ID,
        metadata: {
          name: 'MedVault',
          description: 'Patient-owned medical records on Stellar',
          url: origin,
          icons: [`${origin}/icon-192.png`],
        },
        allowedChains: [
          IS_MAINNET ? WalletConnectTargetChain.PUBLIC : WalletConnectTargetChain.TESTNET,
        ],
      })
    )
  }

  return modules
}

async function prewarmFreighter(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    const { isConnected } = await import('@stellar/freighter-api')
    await isConnected()
  } catch {
    /* extension absent or asleep */
  }
}

function ensureInit(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const mod = await import('@creit.tech/stellar-wallets-kit')
      Kit = mod.StellarWalletsKit
      const modules = await buildModules()
      Kit.init({
        modules,
        network: NETWORK_PASSPHRASE,
        selectedWalletId: localStorage.getItem(SELECTED_KEY) || undefined,
      })
      void prewarmFreighter()
    })()
  }
  return initPromise
}

async function requireKit(): Promise<KitClass> {
  await ensureInit()
  if (!Kit) throw new Error('Wallet kit failed to initialize')
  return Kit
}

function persistSelected() {
  try {
    if (Kit) localStorage.setItem(SELECTED_KEY, Kit.selectedModule.productId)
  } catch {
    /* no module selected */
  }
}

export async function openWalletModal(): Promise<string> {
  const kit = await requireKit()
  const { address } = await kit.authModal()
  currentAddress = address
  persistSelected()
  return address
}

export async function restoreAddress(): Promise<string | null> {
  const kit = await requireKit()
  const id = localStorage.getItem(SELECTED_KEY)
  if (!id) return null
  try {
    kit.setWallet(id)
    const { address } = await kit.selectedModule.getAddress({ skipRequestAccess: true })
    currentAddress = address || null
    return currentAddress
  } catch {
    return null
  }
}

export async function getKitAddress(): Promise<string> {
  const kit = await requireKit()
  if (currentAddress) return currentAddress
  const { address } = await kit.getAddress()
  currentAddress = address
  return address
}

export async function getKitNetworkPassphrase(): Promise<string> {
  const kit = await requireKit()
  const { networkPassphrase } = await kit.getNetwork()
  return networkPassphrase
}

export async function signTx(xdr: string): Promise<string> {
  const kit = await requireKit()
  const address = await getKitAddress()
  const { signedTxXdr } = await kit.signTransaction(xdr, {
    address,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
  return signedTxXdr
}

export async function signMessageWithWallet(message: string): Promise<string> {
  const kit = await requireKit()
  const address = await getKitAddress()
  const { signedMessage } = await kit.signMessage(message, {
    address,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
  if (!signedMessage) throw new Error('Wallet returned an empty signature')
  if (typeof signedMessage === 'string') return signedMessage
  return btoa(String.fromCharCode(...new Uint8Array(signedMessage as ArrayBufferLike)))
}

export async function disconnectKit(): Promise<void> {
  if (Kit) {
    try {
      await Kit.disconnect()
    } catch {
      /* already disconnected */
    }
  }
  currentAddress = null
  localStorage.removeItem(SELECTED_KEY)
  try {
    const { clearKeyCache } = await import('@/lib/keystore')
    clearKeyCache()
  } catch {
    /* keystore not loaded */
  }
}
