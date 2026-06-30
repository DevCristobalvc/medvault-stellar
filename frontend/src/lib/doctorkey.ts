import { ensureKeypair, getStoredKeypair, pubToHex, type Keypair } from '@/lib/eckeys'
import { getPubkey, registerPubkey } from '@/lib/stellar'

export async function isKeyPublished(address: string): Promise<boolean> {
  const local = getStoredKeypair(address)
  if (!local) return false
  const onChain = await getPubkey(address)
  return !!onChain && pubToHex(onChain) === pubToHex(local.pub)
}

export async function publishKeypair(address: string): Promise<Keypair> {
  const keypair = await ensureKeypair(address)
  const onChain = await getPubkey(address)
  if (!onChain || pubToHex(onChain) !== pubToHex(keypair.pub)) {
    await registerPubkey(keypair.pub)
  }
  return keypair
}

export async function loadPrivateKey(address: string): Promise<Uint8Array> {
  const keypair = await ensureKeypair(address)
  return keypair.priv
}
