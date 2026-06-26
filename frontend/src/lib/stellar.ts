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
import { getKitAddress, signTx } from '@/lib/walletKit'

const RPC_URL = import.meta.env.VITE_SOROBAN_RPC?.trim() || 'https://soroban-testnet.stellar.org'
const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID?.trim() || 'CBYNTUAVZ4OSILWID7HE6AYF7FNOJTT2M77TZJ6GUU32VGBXUCMIUBBK'
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

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function scBytes(value: Uint8Array): xdr.ScVal {
  return xdr.ScVal.scvBytes(value as unknown as Buffer)
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function getPublicKey(): Promise<string> {
  return getKitAddress()
}

async function buildAndSubmit(
  method: string,
  args: xdr.ScVal[],
  signerPublicKey: string
): Promise<xdr.ScVal> {
  if (!CONTRACT_ID) throw new Error('VITE_CONTRACT_ID is not set')

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
  const signedXdr = await signTx(prepared.toXDR())

  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)
  const result = await s.sendTransaction(signedTx)

  if (result.status === 'ERROR') throw new Error(`Transaction failed`)

  let getResult = await s.getTransaction(result.hash)
  let attempts = 0
  while (getResult.status === 'NOT_FOUND' && attempts < 20) {
    await new Promise((r) => setTimeout(r, 1500))
    getResult = await s.getTransaction(result.hash)
    attempts++
  }

  if (getResult.status === 'FAILED') {
    const failed = getResult as SorobanRpc.Api.GetFailedTransactionResponse
    const xdrB64 = failed.resultXdr?.toXDR('base64') ?? 'unknown'
    throw new Error(`Transaction FAILED on-chain. ResultXDR: ${xdrB64}`)
  }

  if (getResult.status !== 'SUCCESS') {
    throw new Error(`Transaction did not succeed: ${getResult.status}`)
  }

  return (getResult as SorobanRpc.Api.GetSuccessfulTransactionResponse).returnValue!
}

const SIM_SOURCE = 'GAGJANUXK2IRADH7Z5DZKABFZI6VSFZSB6SJDERLZRXBNQUWWDFZQMSH'

async function readOnlyFrom(
  method: string,
  args: xdr.ScVal[],
  sourcePublicKey: string
): Promise<xdr.ScVal> {
  const s = server()
  const contract = new Contract(CONTRACT_ID)
  const account = await s.getAccount(sourcePublicKey)

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

async function readOnly(method: string, args: xdr.ScVal[]): Promise<xdr.ScVal> {
  return readOnlyFrom(method, args, await getPublicKey())
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

  return bytesToHex(new Uint8Array(scValToNative(retval) as ArrayBuffer))
}

export async function grantAccess(
  doctorAddress: string,
  documentId: string,
  expiresAt: number,
  encryptedKey: Uint8Array
): Promise<string> {
  const patient = await getPublicKey()

  const docIdBytes = scBytes(hexToBytes(documentId))
  const encKeyScVal = scBytes(encryptedKey)
  const retval = await buildAndSubmit(
    'grant_access',
    [
      new Address(patient).toScVal(),
      new Address(doctorAddress).toScVal(),
      docIdBytes,
      nativeToScVal(BigInt(expiresAt), { type: 'u64' }),
      encKeyScVal,
    ],
    patient
  )

  return bytesToHex(new Uint8Array(scValToNative(retval) as ArrayBuffer))
}

export async function getEncryptedKey(tokenId: string): Promise<Uint8Array | null> {
  const tokenBytes = scBytes(hexToBytes(tokenId))
  const retval = await readOnly('get_encrypted_key', [tokenBytes])
  const raw = scValToNative(retval) as Uint8Array | null
  return raw ? new Uint8Array(raw) : null
}

export async function verifyAccess(tokenId: string, doctorAddress: string): Promise<boolean> {
  const tokenBytes = scBytes(hexToBytes(tokenId))
  const retval = await readOnly('verify_access', [
    tokenBytes,
    new Address(doctorAddress).toScVal(),
  ])
  return scValToNative(retval) as boolean
}

export async function logAccess(tokenId: string, patientAddress: string): Promise<void> {
  const doctor = await getPublicKey()
  const tokenBytes = scBytes(hexToBytes(tokenId))

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
  const raw = scValToNative(retval) as Array<{
    doctor: string
    token_id: Uint8Array
    accessed_at: bigint
  }>
  return raw.map((e) => ({
    doctor: e.doctor,
    tokenId: bytesToHex(e.token_id),
    accessedAt: Number(e.accessed_at),
  }))
}

export async function getPatientDocuments(patientAddress: string): Promise<string[]> {
  const retval = await readOnly('get_patient_documents', [
    new Address(patientAddress).toScVal(),
  ])
  const raw = scValToNative(retval) as Uint8Array[]
  return raw.map((id) => bytesToHex(id))
}

export async function getDoctorTokens(doctorAddress: string): Promise<string[]> {
  const retval = await readOnly('get_doctor_tokens', [new Address(doctorAddress).toScVal()])
  const raw = scValToNative(retval) as Uint8Array[]
  return raw.map((id) => bytesToHex(id))
}

export async function revokeAccess(tokenId: string, patientAddress: string): Promise<void> {
  const patient = await getPublicKey()
  if (patient !== patientAddress) throw new Error('Connected wallet does not match patient address')

  const tokenBytes = scBytes(hexToBytes(tokenId))
  await buildAndSubmit(
    'revoke_access',
    [new Address(patient).toScVal(), tokenBytes],
    patient
  )
}

export interface TokenInfo {
  doctor: string
  patient: string
  documentId: string
  expiresAt: number
}

export async function getTokenInfo(tokenId: string): Promise<TokenInfo | null> {
  const tokenBytes = scBytes(hexToBytes(tokenId))
  const retval = await readOnly('get_token_info', [tokenBytes])
  const raw = scValToNative(retval) as {
    doctor: string
    patient: string
    document_id: Uint8Array
    expires_at: bigint
  } | null

  if (!raw) return null
  return {
    doctor: raw.doctor,
    patient: raw.patient,
    documentId: bytesToHex(raw.document_id),
    expiresAt: Number(raw.expires_at),
  }
}

export interface ZkProof {
  merkleRoot: string
  proofA: string
  proofB: string
  proofC: string
  ic0: string
  ic1: string
  alphaG1: string
  betaG2: string
  gammaG2: string
  deltaG2: string
}

export async function verifyZkpProof(proof: ZkProof): Promise<boolean> {
  const b = (hex: string) => scBytes(hexToBytes(hex))
  const retval = await readOnlyFrom(
    'verify_zkp_proof',
    [
      b(proof.merkleRoot),
      b(proof.proofA),
      b(proof.proofB),
      b(proof.proofC),
      b(proof.ic0),
      b(proof.ic1),
      b(proof.alphaG1),
      b(proof.betaG2),
      b(proof.gammaG2),
      b(proof.deltaG2),
    ],
    SIM_SOURCE
  )
  return scValToNative(retval) as boolean
}

export async function getDocument(documentId: string): Promise<Document | null> {
  const docIdBytes = scBytes(hexToBytes(documentId))
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
