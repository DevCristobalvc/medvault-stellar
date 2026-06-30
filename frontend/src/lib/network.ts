import { Networks } from '@stellar/stellar-sdk'

const ENV_PASSPHRASE = import.meta.env.VITE_NETWORK_PASSPHRASE?.trim()

export const NETWORK_PASSPHRASE = ENV_PASSPHRASE || Networks.TESTNET
export const IS_MAINNET = NETWORK_PASSPHRASE === Networks.PUBLIC

export const RPC_URL =
  import.meta.env.VITE_SOROBAN_RPC?.trim() ||
  (IS_MAINNET ? 'https://mainnet.sorobanrpc.com' : 'https://soroban-testnet.stellar.org')

export const SIM_SOURCE =
  import.meta.env.VITE_SIM_SOURCE?.trim() ||
  (IS_MAINNET
    ? 'GAMOHHRV3Z6VKN3R2SRO54VLAW52Y4GY576KRLHAUMEKZGE52I362W7U'
    : 'GAGJANUXK2IRADH7Z5DZKABFZI6VSFZSB6SJDERLZRXBNQUWWDFZQMSH')
