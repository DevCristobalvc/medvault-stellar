import {
  Contract,
  Networks,
  rpc as SorobanRpc,
  TransactionBuilder,
  BASE_FEE,
  xdr,
  scValToNative,
  nativeToScVal,
  Address,
} from '@stellar/stellar-sdk'
import { getPublicKey, signTransaction, isConnected } from '@stellar/freighter-api'

const RPC_URL = import.meta.env.VITE_SOROBAN_RPC ?? 'https://soroban-testnet.stellar.org'
const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID ?? ''
const NETWORK_PASSPHRASE = Networks.TESTNET

export interface Document {
  doctor: string
  patient: string
  cid: string
  docType: string
  createdAt: number
}

export interface AccessEvent {
  doctor: string
  tokenId: string
  accessedAt: number
}

function server() {
  return new SorobanRpc.Server(RPC_URL)
}

async function buildAndSubmit(
  method: string,
  args: xdr.ScVal[],
  signerPublicKey: string
): Promise<xdr.ScVal> {
  const s = server()
  const account = await s.getAccount(signerPublicKey)
  const contract = new Contract(CONTRACT_ID)

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build()

  const prepared = await s.prepareTransaction(tx)
  const { signedTxXdr } = await signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  })

  const signed = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE)
  const result = await s.sendTransaction(signed)

  if (result.status === 'ERROR') throw new Error(`Transaction failed: ${result.errorResult}`)

  let getResult = await s.getTransaction(result.hash)
  let attempts = 0
  while (getResult.status === 'NOT_FOUND' && attempts < 20) {
    await new Promise((r) => setTimeout(r, 1500))
    getResult = await s.getTransaction(result.hash)
    attempts++
  }

  if (getResult.status !== 'SUCCESS') {
    throw new Error(`Transaction did not succeed: ${getResult.status}`)
  }

  return (getResult as SorobanRpc.Api.GetSuccessfulTransactionResponse).returnValue!
}

async function readOnly(method: string, args: xdr.ScVal[]): Promise<xdr.ScVal> {
  const s = server()
  const contract = new Contract(CONTRACT_ID)
  const publicKey = await getPublicKey()
  const account = await s.getAccount(publicKey)

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build()

  const result = await s.simulateTransaction(tx)
  if (!SorobanRpc.Api.isSimulationSuccess(result)) {
    throw new Error(`Simulation failed: ${JSON.stringify(result)}`)
  }

  return (result as SorobanRpc.Api.SimulateTransactionSuccessResponse).result!.retval
}

export async function walletConnected(): Promise<boolean> {
  const connected = await isConnected()
  return connected.isConnected
}

export async function getWalletPublicKey(): Promise<string> {
  return getPublicKey()
}

export async function registerDocument(
  patientAddress: string,
  cid: string,
  docType: string
): Promise<string> {
  const doctor = await getPublicKey()

  const retval = await buildAndSubmit(
    'register_document',
    [
      new Address(doctor).toScVal(),
      new Address(patientAddress).toScVal(),
      nativeToScVal(cid, { type: 'string' }),
      nativeToScVal(docType, { type: 'string' }),
    ],
    doctor
  )

  return Buffer.from(scValToNative(retval) as Uint8Array).toString('hex')
}

export async function grantAccess(
  doctorAddress: string,
  documentId: string,
  expiresAt: number
): Promise<string> {
  const patient = await getPublicKey()

  const docIdBytes = xdr.ScVal.scvBytes(Buffer.from(documentId, 'hex'))
  const retval = await buildAndSubmit(
    'grant_access',
    [
      new Address(patient).toScVal(),
      new Address(doctorAddress).toScVal(),
      docIdBytes,
      nativeToScVal(BigInt(expiresAt), { type: 'u64' }),
    ],
    patient
  )

  return Buffer.from(scValToNative(retval) as Uint8Array).toString('hex')
}

export async function verifyAccess(tokenId: string, doctorAddress: string): Promise<boolean> {
  const tokenBytes = xdr.ScVal.scvBytes(Buffer.from(tokenId, 'hex'))
  const retval = await readOnly('verify_access', [
    tokenBytes,
    new Address(doctorAddress).toScVal(),
  ])
  return scValToNative(retval) as boolean
}

export async function logAccess(tokenId: string, patientAddress: string): Promise<void> {
  const doctor = await getPublicKey()
  const tokenBytes = xdr.ScVal.scvBytes(Buffer.from(tokenId, 'hex'))

  await buildAndSubmit(
    'log_access',
    [
      new Address(doctor).toScVal(),
      tokenBytes,
      new Address(patientAddress).toScVal(),
    ],
    doctor
  )
}

export async function getAuditLog(patientAddress: string): Promise<AccessEvent[]> {
  const retval = await readOnly('get_audit_log', [new Address(patientAddress).toScVal()])
  const raw = scValToNative(retval) as Array<{ doctor: string; token_id: Uint8Array; accessed_at: bigint }>
  return raw.map((e) => ({
    doctor: e.doctor,
    tokenId: Buffer.from(e.token_id).toString('hex'),
    accessedAt: Number(e.accessed_at),
  }))
}

export async function getPatientDocuments(patientAddress: string): Promise<string[]> {
  const retval = await readOnly('get_patient_documents', [
    new Address(patientAddress).toScVal(),
  ])
  const raw = scValToNative(retval) as Uint8Array[]
  return raw.map((id) => Buffer.from(id).toString('hex'))
}

export async function getDocument(documentId: string): Promise<Document | null> {
  const docIdBytes = xdr.ScVal.scvBytes(Buffer.from(documentId, 'hex'))
  const retval = await readOnly('get_document', [docIdBytes])
  const raw = scValToNative(retval) as {
    doctor: string
    patient: string
    cid: string
    doc_type: string
    created_at: bigint
  } | null

  if (!raw) return null
  return {
    doctor: raw.doctor,
    patient: raw.patient,
    cid: raw.cid,
    docType: raw.doc_type,
    createdAt: Number(raw.created_at),
  }
}
