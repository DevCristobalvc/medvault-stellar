import { StellarWalletsKit, Networks, type ModuleInterface } from '@creit.tech/stellar-wallets-kit'
import { FreighterModule } from '@creit.tech/stellar-wallets-kit/modules/freighter'
import { xBullModule } from '@creit.tech/stellar-wallets-kit/modules/xbull'
import { AlbedoModule } from '@creit.tech/stellar-wallets-kit/modules/albedo'
import { RabetModule } from '@creit.tech/stellar-wallets-kit/modules/rabet'
import { HanaModule } from '@creit.tech/stellar-wallets-kit/modules/hana'
import { LobstrModule } from '@creit.tech/stellar-wallets-kit/modules/lobstr'

const SELECTED_KEY = 'medvault_wallet_id'
const WC_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim()

let initPromise: Promise<void> | null = null
let currentAddress: string | null = null

async function buildModules(): Promise<ModuleInterface[]> {
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
        allowedChains: [WalletConnectTargetChain.TESTNET],
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
    initPromise = buildModules().then((modules) => {
      StellarWalletsKit.init({
        modules,
        network: Networks.TESTNET,
        selectedWalletId: localStorage.getItem(SELECTED_KEY) || undefined,
      })
      void prewarmFreighter()
    })
  }
  return initPromise
}

function persistSelected() {
  try {
    localStorage.setItem(SELECTED_KEY, StellarWalletsKit.selectedModule.productId)
  } catch {
    /* no module selected */
  }
}

export async function openWalletModal(): Promise<string> {
  await ensureInit()
  const { address } = await StellarWalletsKit.authModal()
  currentAddress = address
  persistSelected()
  return address
}

export async function restoreAddress(): Promise<string | null> {
  await ensureInit()
  const id = localStorage.getItem(SELECTED_KEY)
  if (!id) return null
  try {
    StellarWalletsKit.setWallet(id)
    const { address } = await StellarWalletsKit.selectedModule.getAddress({ skipRequestAccess: true })
    currentAddress = address || null
    return currentAddress
  } catch {
    return null
  }
}

export async function getKitAddress(): Promise<string> {
  await ensureInit()
  if (currentAddress) return currentAddress
  const { address } = await StellarWalletsKit.getAddress()
  currentAddress = address
  return address
}

export async function getKitNetworkPassphrase(): Promise<string> {
  await ensureInit()
  const { networkPassphrase } = await StellarWalletsKit.getNetwork()
  return networkPassphrase
}

export async function signTx(xdr: string): Promise<string> {
  await ensureInit()
  const address = await getKitAddress()
  const { signedTxXdr } = await StellarWalletsKit.signTransaction(xdr, {
    address,
    networkPassphrase: Networks.TESTNET,
  })
  return signedTxXdr
}

export async function disconnectKit(): Promise<void> {
  try {
    await StellarWalletsKit.disconnect()
  } catch {
    /* already disconnected */
  }
  currentAddress = null
  localStorage.removeItem(SELECTED_KEY)
}

export { Networks as KitNetworks }
