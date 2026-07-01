import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { MermaidDiagram } from '@/components/MermaidDiagram'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { t, type Lang } from '@/lib/i18n'
import { verifyZkpProof, type ZkProof } from '@/lib/stellar'
import {
  generateMembershipProof,
  DEFAULT_DOCTOR,
  DEFAULT_AUTHORIZED_SET,
  type ProverStage,
} from '@/lib/zkp/prover'

interface ProtocolPageProps { lang: Lang }

const CONTRACT_ID = 'CAENHTIXAUOJ3AIWINZP3RRJQNADCLQ4HCYJZZV5TFYWRK2WU5VHKCK3'
const PREV_CONTRACT_ID = 'CBYNTUAVZ4OSILWID7HE6AYF7FNOJTT2M77TZJ6GUU32VGBXUCMIUBBK'
const MAINNET_CONTRACT_ID = 'CCNCFPI2MN4ZUYYQDT2KH25B7V45P6WXFRSQ5LHM4RSSKE75D2LLFFJA'
const REPO_URL = 'https://github.com/DevCristobalvc/medvault-stellar'

const expertUrl = (id: string) => `https://stellar.expert/explorer/testnet/contract/${id}`
const expertUrlPublic = (id: string) => `https://stellar.expert/explorer/public/contract/${id}`

const DEPLOYMENTS = [
  {
    id: CONTRACT_ID,
    tag: 'v0.5 · ECIES',
    net: 'Testnet',
    current: true,
    note: {
      en: 'Current deployment. Adds register_pubkey / get_pubkey: an on-chain X25519 public-key directory enabling ECIES sharing (no copyable key). 14 exported functions.',
      es: 'Despliegue actual. Agrega register_pubkey / get_pubkey: un directorio on-chain de claves públicas X25519 que habilita el compartir con ECIES (sin clave copiable). 14 funciones exportadas.',
      pt: 'Implantação atual. Adiciona register_pubkey / get_pubkey: um diretório on-chain de chaves públicas X25519 que habilita o compartilhamento com ECIES (sem chave copiável). 14 funções exportadas.',
    },
  },
  {
    id: MAINNET_CONTRACT_ID,
    tag: 'v0.5.1 · enum-hardened',
    net: 'Mainnet',
    current: false,
    note: {
      en: 'Live on Stellar Mainnet (Public network). docType is locked to a closed enum (ClinicalHistory, LabResult, Imaging, Prescription, Other) so no free-text PII can leak to the public ledger. Same 14 functions, verified end-to-end on mainnet.',
      es: 'En vivo en Stellar Mainnet (red principal). docType está fijado a un enum cerrado (ClinicalHistory, LabResult, Imaging, Prescription, Other) para que ningún texto libre con PII se filtre al ledger público. Las mismas 14 funciones, verificadas de extremo a extremo en mainnet.',
      pt: 'Ao vivo na Stellar Mainnet (rede principal). docType está fixado num enum fechado (ClinicalHistory, LabResult, Imaging, Prescription, Other) para que nenhum texto livre com PII vaze para o ledger público. As mesmas 14 funções, verificadas de ponta a ponta na mainnet.',
    },
  },
  {
    id: PREV_CONTRACT_ID,
    tag: 'v0.4 · KEM',
    net: 'Testnet',
    current: false,
    note: {
      en: 'Previous deployment, kept for traceability. 12 functions, exercised end-to-end by integration_test.sh (register → grant → verify → key round-trip → log → revoke, proving require_auth on-chain).',
      es: 'Despliegue anterior, conservado por trazabilidad. 12 funciones, probado de extremo a extremo por integration_test.sh (register → grant → verify → round-trip de clave → log → revoke, demostrando require_auth on-chain).',
      pt: 'Implantação anterior, mantida por rastreabilidade. 12 funções, testado de ponta a ponta por integration_test.sh (register → grant → verify → round-trip da chave → log → revoke, provando require_auth on-chain).',
    },
  },
]

const REPOS = [
  { label: 'Monorepo (frontend + contract + circuits)', sub: 'github.com/DevCristobalvc/medvault-stellar', url: REPO_URL },
  { label: 'Soroban contract | lib.rs', sub: 'contracts/medvault · Rust', url: `${REPO_URL}/tree/Master/contracts/medvault` },
  { label: 'In-browser ZK prover | snarkjs + Poseidon', sub: 'frontend/src/lib/zkp · Groth16 over BLS12-381', url: `${REPO_URL}/tree/Master/frontend/src/lib/zkp` },
  { label: 'Contract on Stellar Expert (Testnet)', sub: CONTRACT_ID.slice(0, 24) + '…', url: `https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}` },
  { label: 'Contract on Stellar Expert (Mainnet)', sub: MAINNET_CONTRACT_ID.slice(0, 24) + '…', url: `https://stellar.expert/explorer/public/contract/${MAINNET_CONTRACT_ID}` },
]

const ZK_JWT_COPY = {
  title: { en: 'ZK proof as a privacy-preserving access credential (ZK-JWT)', es: 'La prueba ZK como credencial de acceso con privacidad (ZK-JWT)', pt: 'A prova ZK como credencial de acesso com privacidade (ZK-JWT)' },
  body: {
    en: 'A classic JWT is a bearer token: a server signs claims and anyone holding the token is trusted, while the issuer learns who authenticated. MedVault replaces that with a ZK-JWT | the doctor presents a Groth16 proof instead of a signed claim. The proof asserts a single claim ("this wallet is in the authorized-doctor Merkle set") and is verified by the Soroban contract\'s native BLS12-381 pairing_check, not by a secret-holding server. No central authority signs it, the verifier is the blockchain, and the proof never reveals which member of the set the doctor is. The Merkle root is the only public input | the analog of a JWT\'s `aud`/`iss`. Expiry and revocation are enforced separately on-chain by the access token (grant_access / revoke_access), so a valid proof alone is not standing access: identity (ZK) and authorization-in-time (token) are decoupled.',
    es: 'Un JWT clásico es un bearer token: un servidor firma claims y se confía en quien tenga el token, mientras el emisor sabe quién se autenticó. MedVault lo reemplaza por un ZK-JWT | el médico presenta una prueba Groth16 en vez de un claim firmado. La prueba afirma un único claim ("esta wallet está en el conjunto Merkle de médicos autorizados") y la verifica el pairing_check nativo BLS12-381 del contrato Soroban, no un servidor con un secreto. Ninguna autoridad central la firma, el verificador es la blockchain, y la prueba nunca revela cuál miembro del conjunto es el médico. La raíz Merkle es el único input público | el análogo del `aud`/`iss` de un JWT. La expiración y la revocación se aplican aparte on-chain mediante el token de acceso (grant_access / revoke_access), así que una prueba válida por sí sola no es acceso permanente: identidad (ZK) y autorización-en-el-tiempo (token) están desacopladas.',
    pt: 'Um JWT clássico é um bearer token: um servidor assina claims e confia-se em quem tiver o token, enquanto o emissor sabe quem se autenticou. A MedVault substitui isso por um ZK-JWT | o médico apresenta uma prova Groth16 em vez de um claim assinado. A prova afirma um único claim ("esta wallet está no conjunto Merkle de médicos autorizados") e é verificada pelo pairing_check nativo BLS12-381 do contrato Soroban, não por um servidor com um segredo. Nenhuma autoridade central a assina, o verificador é a blockchain, e a prova nunca revela qual membro do conjunto é o médico. A raiz Merkle é o único input público | o análogo do `aud`/`iss` de um JWT. A expiração e a revogação são aplicadas à parte on-chain via token de acesso (grant_access / revoke_access), então uma prova válida por si só não é acesso permanente: identidade (ZK) e autorização-no-tempo (token) estão desacopladas.',
  },
  repos: { en: 'Source & repositories', es: 'Código y repositorios', pt: 'Código e repositórios' },
}

const ENDPOINTS = [
  { fn: 'register_document', sig: '(doctor, patient, cid, doc_type) → doc_id', auth: 'Doctor',   storage: 'Persistent', desc: { en: 'Store the IPFS CID and metadata of an encrypted document under the patient. Returns the deterministic document_id (BytesN<32>).', es: 'Guarda el CID de IPFS y la metadata de un documento cifrado bajo el paciente. Devuelve el document_id determinístico (BytesN<32>).', pt: 'Armazena o CID do IPFS e os metadados de um documento cifrado sob o paciente. Retorna o document_id determinístico (BytesN<32>).' } },
  { fn: 'register_pubkey',   sig: '(owner, pubkey: BytesN<32>)', auth: 'Owner',    storage: 'Persistent', desc: { en: 'Doctor publishes their X25519 public key so patients can ECIES-wrap document keys to it. Key derived from a wallet signature (sign-to-derive), never leaves as a copyable secret.', es: 'El médico publica su clave pública X25519 para que los pacientes envuelvan claves de documento con ECIES hacia ella. La clave se deriva de una firma de la wallet (sign-to-derive) y nunca sale como secreto copiable.', pt: 'O médico publica sua chave pública X25519 para que pacientes envolvam chaves de documento com ECIES para ela. A chave deriva de uma assinatura da wallet (sign-to-derive) e nunca sai como segredo copiável.' } },
  { fn: 'get_pubkey',        sig: '(owner) → Option<BytesN<32>>', auth: 'None',    storage: 'Read',       desc: { en: "Returns the owner's registered X25519 public key, or None if they haven't enabled secure receiving yet.", es: 'Devuelve la clave pública X25519 registrada del owner, o None si aún no habilitó la recepción segura.', pt: 'Retorna a chave pública X25519 registrada do owner, ou None se ainda não habilitou a recepção segura.' } },
  { fn: 'grant_access',      sig: '(patient, doctor, doc_id, expires_at, encrypted_key) → token_id', auth: 'Patient',  storage: 'Temporary',  desc: { en: 'Patient mints a time-bound access token for a doctor and stores the ECIES-wrapped AES key on-chain. TTL auto-derived from expires_at (+120 ledgers).', es: 'El paciente emite un token de acceso temporizado para un médico y guarda la AES key envuelta con ECIES on-chain. El TTL se deriva de expires_at (+120 ledgers).', pt: 'O paciente emite um token de acesso temporizado para um médico e armazena a AES key envolvida com ECIES on-chain. O TTL deriva de expires_at (+120 ledgers).' } },
  { fn: 'verify_access',     sig: '(token_id, doctor) → bool', auth: 'None',     storage: 'Read',       desc: { en: 'Returns true only if the token exists, belongs to that doctor, and has not expired.', es: 'Devuelve true solo si el token existe, pertenece a ese médico y no ha expirado.', pt: 'Retorna true apenas se o token existe, pertence a esse médico e não expirou.' } },
  { fn: 'revoke_access',     sig: '(patient, token_id)', auth: 'Patient',  storage: 'Temporary',  desc: { en: 'Patient deletes a token before its expiry, instantly cutting the doctor off.', es: 'El paciente elimina un token antes de expirar, cortando el acceso del médico al instante.', pt: 'O paciente elimina um token antes de expirar, cortando o acesso do médico instantaneamente.' } },
  { fn: 'log_access',        sig: '(doctor, token_id, patient)', auth: 'Doctor',   storage: 'Persistent', desc: { en: 'Appends an immutable AccessEvent (doctor, timestamp) to the patient audit log.', es: 'Agrega un AccessEvent inmutable (médico, timestamp) al audit log del paciente.', pt: 'Adiciona um AccessEvent imutável (médico, timestamp) ao audit log do paciente.' } },
  { fn: 'get_audit_log',     sig: '(patient) → Vec<AccessEvent>', auth: 'None',     storage: 'Read',       desc: { en: "Returns the full, append-only access history for a patient.", es: 'Devuelve el historial de accesos completo y append-only del paciente.', pt: 'Retorna o histórico de acessos completo e append-only do paciente.' } },
  { fn: 'get_document',      sig: '(doc_id) → Option<Document>', auth: 'None',     storage: 'Read',       desc: { en: 'Returns document metadata (doctor, patient, cid, doc_type, created_at) or None.', es: 'Devuelve la metadata del documento (doctor, paciente, cid, doc_type, created_at) o None.', pt: 'Retorna os metadados do documento (médico, paciente, cid, doc_type, created_at) ou None.' } },
  { fn: 'get_token_info',    sig: '(token_id) → Option<AccessToken>', auth: 'None',     storage: 'Read',       desc: { en: 'Resolves the AccessToken (doctor, patient, document_id, expires_at) from a token.', es: 'Resuelve el AccessToken (doctor, paciente, document_id, expires_at) desde un token.', pt: 'Resolve o AccessToken (médico, paciente, document_id, expires_at) a partir de um token.' } },
  { fn: 'get_patient_documents', sig: '(patient) → Vec<BytesN<32>>', auth: 'None',  storage: 'Read',   desc: { en: 'Lists every document_id registered for a patient.', es: 'Lista todos los document_id registrados para un paciente.', pt: 'Lista todos os document_id registrados para um paciente.' } },
  { fn: 'get_encrypted_key', sig: '(token_id) → Option<Bytes>', auth: 'None',    storage: 'Read',       desc: { en: 'Returns the opaque wrapped AES key (KEM blob) stored with the token. Decryptable only with the matching wrapping key.', es: 'Devuelve la AES key envuelta opaca (blob KEM) guardada con el token. Solo se descifra con la wrapping key correspondiente.', pt: 'Retorna a AES key envolvida opaca (blob KEM) armazenada com o token. Descriptografável apenas com a wrapping key correspondente.' } },
  { fn: 'get_doctor_tokens', sig: '(doctor) → Vec<BytesN<32>>', auth: 'None',    storage: 'Read',       desc: { en: 'Lists every access token issued to a doctor across patients.', es: 'Lista todos los tokens de acceso emitidos a un médico entre pacientes.', pt: 'Lista todos os tokens de acesso emitidos a um médico entre pacientes.' } },
  { fn: 'verify_zkp_proof',  sig: '(merkle_root, proof_a, proof_b, proof_c, ic_0, ic_1, alpha_g1, beta_g2, gamma_g2, delta_g2) → bool', auth: 'None',     storage: 'Read',      desc: { en: 'Verifies a Groth16 proof on-chain via native BLS12-381 pairing_check (CAP-0052): e(-A,B)·e(α,β)·e(L,γ)·e(C,δ) == 1. Proves doctor membership without revealing identity.', es: 'Verifica una prueba Groth16 on-chain vía pairing_check nativo BLS12-381 (CAP-0052): e(-A,B)·e(α,β)·e(L,γ)·e(C,δ) == 1. Prueba la membresía del médico sin revelar identidad.', pt: 'Verifica uma prova Groth16 on-chain via pairing_check nativo BLS12-381 (CAP-0052): e(-A,B)·e(α,β)·e(L,γ)·e(C,δ) == 1. Prova a associação do médico sem revelar identidade.' } },
]

const ARCH_DIAGRAM = `flowchart TB
  subgraph CLIENT["Browser - patient and doctor"]
    WALLET["Stellar wallet - sign to derive X25519 key"]
    ENC["AES-256-GCM - encrypt and decrypt in RAM"]
    ECIES["ECIES - wrap and unwrap with X25519 and HKDF"]
    ZK["Groth16 prover - snarkjs and Poseidon"]
  end
  subgraph SOROBAN["Stellar Soroban contract"]
    PUBDIR["Pubkey directory - register_pubkey and get_pubkey"]
    DOCS["Documents - register_document and get_document"]
    GRANT["Access tokens - grant, verify and revoke"]
    KEYBLOB["Wrapped key store - get_encrypted_key"]
    ZKV["ZK verifier - BLS12-381 pairing check"]
    AUDIT["Audit log - log_access and get_audit_log"]
  end
  subgraph STORAGE["IPFS via Pinata"]
    BLOB["Encrypted blob - ciphertext and iv"]
  end
  WALLET -->|publish public key| PUBDIR
  ENC -->|upload ciphertext| BLOB
  ENC -->|CID and metadata| DOCS
  GRANT -->|read recipient key| PUBDIR
  ECIES -->|store wrapped key| KEYBLOB
  ECIES -->|mint token| GRANT
  ZK -->|submit proof| ZKV
  ZKV -->|membership valid| GRANT
  KEYBLOB -->|wrapped key| ECIES
  BLOB -->|ciphertext| ENC
  GRANT -->|record access| AUDIT`

const ACCESS_DIAGRAM = `sequenceDiagram
  participant D as Doctor
  participant P as Patient
  participant SC as Soroban
  participant IP as IPFS

  Note over D,SC: One-time enrollment
  D->>SC: register_pubkey(X25519 public key)

  Note over D,IP: Doctor uploads a record
  D->>D: AES-256-GCM encrypt
  D->>IP: store ciphertext and iv
  IP-->>D: CID
  D->>SC: register_document(patient, CID, doc_type)

  Note over P,SC: Patient grants time-bound access
  P->>SC: get_pubkey(doctor)
  SC-->>P: doctor X25519 public key
  P->>P: ECIES wrap AES key with ephemeral X25519
  P->>SC: grant_access(doctor, doc_id, expires_at, wrapped_key)
  SC-->>P: token_id
  P-->>D: QR with token_id only

  Note over D,SC: Doctor opens the record
  D->>D: generate ZK membership proof
  D->>SC: verify_zkp_proof(proof)
  SC-->>D: true via BLS12-381 pairing
  D->>SC: verify_access(token_id)
  SC-->>D: true
  D->>SC: get_encrypted_key(token_id)
  SC-->>D: wrapped AES key
  D->>IP: download(CID)
  IP-->>D: ciphertext and iv
  D->>D: ECIES unwrap and AES decrypt in RAM
  D->>SC: log_access(token_id)`

const INTEGRATION_CODE = `import { Contract, Networks, rpc } from '@stellar/stellar-sdk'

const CONTRACT = 'CAENHTIXAUOJ3AIWINZP3RRJQNADCLQ4HCYJZZV5TFYWRK2WU5VHKCK3'
const server = new rpc.Server('https://soroban-testnet.stellar.org')
const contract = new Contract(CONTRACT)

// Register a document
const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
  .addOperation(contract.call('register_document', doctorAddr, patientAddr, cidScVal, docTypeScVal))
  .setTimeout(30).build()

const prepared = await server.prepareTransaction(tx)
// → sign with any Stellar wallet, submit`

type Desc = { en: string; es: string; pt: string }

const ZK_COPY = {
  title: { en: 'ZK Merkle membership | proven in-browser, verified on-chain', es: 'Membresía Merkle ZK | generada en el navegador, verificada on-chain', pt: 'Associação Merkle ZK | gerada no navegador, verificada on-chain' },
  desc: {
    en: 'The Groth16 proof (BLS12-381) is generated entirely in your browser with snarkjs and a Poseidon implementation over the BLS12-381 scalar field, then verified live by the deployed contract via env.crypto().bls12_381().pairing_check (CAP-0052). It proves the wallet belongs to the authorized-doctor set without revealing which member.',
    es: 'La prueba Groth16 (BLS12-381) se genera íntegramente en tu navegador con snarkjs y una implementación de Poseidon sobre el campo escalar de BLS12-381, y luego la verifica en vivo el contrato vía env.crypto().bls12_381().pairing_check (CAP-0052). Demuestra que la wallet pertenece al conjunto de médicos autorizados sin revelar cuál.',
    pt: 'A prova Groth16 (BLS12-381) é gerada inteiramente no seu navegador com snarkjs e uma implementação de Poseidon sobre o campo escalar de BLS12-381, e então verificada ao vivo pelo contrato via env.crypto().bls12_381().pairing_check (CAP-0052). Prova que a wallet pertence ao conjunto de médicos autorizados sem revelar qual.',
  },
  walletLabel: { en: 'Doctor wallet (member to prove)', es: 'Wallet del médico (miembro a probar)', pt: 'Wallet do médico (membro a provar)' },
  setLabel: { en: 'Authorized set', es: 'Conjunto autorizado', pt: 'Conjunto autorizado' },
  button: { en: 'Generate proof & verify on-chain', es: 'Generar prueba y verificar on-chain', pt: 'Gerar prova e verificar on-chain' },
  rootLabel: { en: 'Public input (Merkle root)', es: 'Input público (raíz Merkle)', pt: 'Input público (raiz Merkle)' },
  ok: { en: 'Proof accepted on-chain | pairing check passed', es: 'Prueba aceptada on-chain | pairing check válido', pt: 'Prova aceita on-chain | pairing check válido' },
  bad: { en: 'Proof rejected by contract', es: 'Prueba rechazada por el contrato', pt: 'Prova rejeitada pelo contrato' },
}

const STAGE_COPY: Record<ProverStage | 'verifying-onchain', { en: string; es: string; pt: string }> = {
  'building-tree': { en: 'Building Merkle tree (Poseidon over BLS12-381)…', es: 'Construyendo árbol Merkle (Poseidon sobre BLS12-381)…', pt: 'Construindo árvore Merkle (Poseidon sobre BLS12-381)…' },
  proving: { en: 'Generating Groth16 proof (snarkjs)…', es: 'Generando prueba Groth16 (snarkjs)…', pt: 'Gerando prova Groth16 (snarkjs)…' },
  'verifying-local': { en: 'Verifying proof locally…', es: 'Verificando prueba localmente…', pt: 'Verificando prova localmente…' },
  'verifying-onchain': { en: 'Verifying on Soroban contract…', es: 'Verificando en el contrato Soroban…', pt: 'Verificando no contrato Soroban…' },
}

function ZkVerifyPanel({ lang }: { lang: Lang }) {
  const [status, setStatus] = useState<'idle' | 'busy' | 'ok' | 'bad' | 'error'>('idle')
  const [stage, setStage] = useState<ProverStage | 'verifying-onchain' | null>(null)
  const [error, setError] = useState('')
  const [root, setRoot] = useState('')
  const [proof, setProof] = useState<ZkProof | null>(null)
  const [showProof, setShowProof] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  async function run() {
    setStatus('busy')
    setError('')
    setRoot('')
    setProof(null)
    const started = performance.now()
    try {
      const { proof: zk } = await generateMembershipProof(DEFAULT_DOCTOR, DEFAULT_AUTHORIZED_SET, setStage)
      setRoot(zk.merkleRoot)
      setProof(zk)
      setStage('verifying-onchain')
      const ok = await verifyZkpProof(zk)
      setElapsed(Math.round(performance.now() - started))
      setStatus(ok ? 'ok' : 'bad')
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setStage(null)
    }
  }

  return (
    <div className="rounded-xl border border-border p-4 flex flex-col gap-4">
      <p className="text-sm text-muted-foreground leading-relaxed">{ZK_COPY.desc[lang]}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{ZK_COPY.walletLabel[lang]}</span>
          <code className="font-mono text-[11px] break-all bg-muted/50 rounded-md px-3 py-2 text-foreground">{DEFAULT_DOCTOR}</code>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{ZK_COPY.setLabel[lang]}</span>
          <code className="font-mono text-[11px] break-all bg-muted/50 rounded-md px-3 py-2 text-muted-foreground">
            {DEFAULT_AUTHORIZED_SET.length} {lang === 'en' ? 'members' : lang === 'es' ? 'miembros' : 'membros'} · 2^10 leaves
          </code>
        </div>
      </div>

      {root && (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{ZK_COPY.rootLabel[lang]}</span>
          <code className="font-mono text-[11px] break-all bg-muted/50 rounded-md px-3 py-2 text-foreground">0x{root}</code>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={run} disabled={status === 'busy'} size="sm">
          {status === 'busy' && stage ? STAGE_COPY[stage][lang] : ZK_COPY.button[lang]}
        </Button>
        {status === 'ok' && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
            <span className="w-2 h-2 rounded-full bg-green-500" /> {ZK_COPY.ok[lang]} {elapsed > 0 && `(${(elapsed / 1000).toFixed(1)}s)`}
          </span>
        )}
        {status === 'bad' && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
            <span className="w-2 h-2 rounded-full bg-red-500" /> {ZK_COPY.bad[lang]}
          </span>
        )}
        {status === 'error' && <span className="text-xs text-red-600 break-all">{error}</span>}
      </div>

      {proof && (
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setShowProof((v) => !v)}
            className="text-xs text-primary self-start hover:underline"
          >
            {showProof ? '− ' : '+ '}
            {lang === 'en' ? 'proof bytes' : lang === 'es' ? 'bytes de la prueba' : 'bytes da prova'}
          </button>
          {showProof && (
            <pre className="rounded-lg border border-border bg-muted/40 p-3 text-[10px] font-mono overflow-x-auto text-muted-foreground leading-relaxed">
              <code>{`pi_a (G1, 96B): ${proof.proofA}
pi_b (G2, 192B): ${proof.proofB}
pi_c (G1, 96B): ${proof.proofC}`}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

export function ProtocolPage({ lang }: ProtocolPageProps) {
  return (
    <div className="flex flex-col gap-0">
      <section className="flex flex-col items-center text-center gap-6 px-5 pt-14 pb-10 md:pt-20 md:pb-14">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary font-medium">
          {t('protocol', 'badge', lang)}
        </div>
        <h1 className="text-3xl md:text-5xl font-semibold tracking-tight max-w-xl leading-tight">
          {t('protocol', 'headline', lang)}
        </h1>
        <p className="text-muted-foreground text-base max-w-md leading-relaxed">
          {t('protocol', 'sub', lang)}
        </p>
        <div className="font-mono text-xs bg-muted/60 border border-border rounded-lg px-4 py-2 text-muted-foreground">
          {CONTRACT_ID}
        </div>
      </section>

      <div className="px-5 md:px-8 max-w-4xl mx-auto w-full flex flex-col gap-12 pb-16">

        <section>
          <h2 className="text-base font-semibold mb-1">{t('protocol', 'arch', lang)}</h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{t('protocol', 'arch_sub', lang)}</p>
          <MermaidDiagram chart={ARCH_DIAGRAM} id="arch" />
        </section>

        <section>
          <h2 className="text-base font-semibold mb-1">{t('protocol', 'flow', lang)}</h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{t('protocol', 'flow_sub', lang)}</p>
          <MermaidDiagram chart={ACCESS_DIAGRAM} id="flow" />
        </section>

        <Separator />

        <section>
          <h2 className="text-base font-semibold mb-4">{t('protocol', 'endpoints', lang)}</h2>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Function</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Auth</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Storage</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ENDPOINTS.map((ep) => (
                  <tr key={ep.fn} className="hover:bg-muted/20 transition-colors align-top">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-primary">{ep.fn}</span>
                      <span className="block font-mono text-[10px] text-muted-foreground/70 mt-1 break-all">{ep.sig}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge variant="outline" className="text-xs">{ep.auth}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{ep.storage}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{(ep.desc as Desc)[lang]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Separator />

        <section>
          <h2 className="text-base font-semibold mb-2">{t('protocol', 'integrate', lang)}</h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            {t('protocol', 'integrate_desc', lang)}
          </p>
          <pre className="rounded-xl border border-border bg-muted/40 p-4 text-xs font-mono overflow-x-auto text-foreground leading-relaxed">
            <code>{INTEGRATION_CODE}</code>
          </pre>
        </section>

        <Separator />

        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold">{ZK_COPY.title[lang]}</h2>
            <Badge className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0">Live</Badge>
          </div>
          <ZkVerifyPanel lang={lang} />
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-base font-semibold">{ZK_JWT_COPY.title[lang]}</h2>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">ZK-JWT</Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{ZK_JWT_COPY.body[lang]}</p>
        </section>

        <Separator />

        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold">Cryptography Roadmap</h2>
            <Badge variant="outline" className="text-xs">v1 → v4</Badge>
          </div>

          <div className="flex flex-col gap-3">
            {[
              {
                version: 'v1 (current)',
                title: 'AES key in URL hash',
                desc: 'AES key travels in #key= fragment. Secure in transit (never reaches servers). Dependent on URL link.',
                status: 'live',
              },
              {
                version: 'v2 (superseded)',
                title: 'On-chain encrypted key (KEM)',
                desc: 'AES key encrypted with a random wrapping key. Encrypted key stored on Soroban. Only #wk= travels in URL. Two-factor: blockchain + URL. Replaced by v3 ECIES.',
                status: 'idle',
              },
              {
                version: 'v3 (current)',
                title: 'ECIES + sign-to-derive (no copyable key)',
                desc: 'Shipped. The doctor publishes an X25519 public key on-chain (register_pubkey), derived from a wallet signature (seed = SHA-512(sig)[0..32]) and persisted locally. The patient reads it (get_pubkey) and wraps the AES key via ephemeral X25519 ECDH + HKDF-SHA256 + AES-GCM, storing version || eph_pub || iv || ct in encrypted_key. Nothing travels in the URL or QR: decrypting requires *being* the doctor wallet. Note: cross-device re-derivation depends on signMessage being byte-deterministic in the wallet.',
                status: 'live',
              },
              {
                version: 'v4 (live POC)',
                title: 'ZKP Merkle membership (BLS12-381)',
                desc: 'Doctor proves membership in authorized set without revealing identity. Groth16 proof verified on-chain via Stellar\'s native BLS12-381 pairing_check (CAP-0052), Poseidon over the BLS scalar field (CAP-0075). Circuit: merkle_membership_stellar.circom.',
                status: 'live',
              },
            ].map((item) => (
              <div key={item.version} className="flex gap-3 rounded-lg border border-border p-3">
                <div className="shrink-0 pt-0.5">
                  <span className={`inline-block w-2 h-2 rounded-full mt-1 ${
                    item.status === 'live' ? 'bg-green-500' :
                    item.status === 'planned' ? 'bg-amber-400' : 'bg-muted-foreground/40'
                  }`} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-muted-foreground">{item.version}</span>
                    <span className="text-sm font-medium">{item.title}</span>
                    {item.status === 'live' && <Badge className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0">Live</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Separator />

        <section>
          <h2 className="text-base font-semibold mb-1">
            {lang === 'en' ? 'Contract deployments' : lang === 'es' ? 'Despliegues del contrato' : 'Implantações do contrato'}
          </h2>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
            {lang === 'en'
              ? 'Every deployment is kept on-chain and searchable. Earlier versions stay reachable for traceability and their test history.'
              : lang === 'es'
              ? 'Cada despliegue queda on-chain y es consultable. Las versiones anteriores siguen accesibles por trazabilidad y su historial de tests.'
              : 'Cada implantação fica on-chain e pesquisável. Versões anteriores permanecem acessíveis por rastreabilidade e seu histórico de testes.'}
          </p>
          <div className="flex flex-col gap-3">
            {DEPLOYMENTS.map((d) => (
              <a
                key={d.id}
                href={d.net === 'Mainnet' ? expertUrlPublic(d.id) : expertUrl(d.id)}
                target="_blank"
                rel="noreferrer"
                className="flex items-start justify-between gap-3 rounded-lg border border-border px-4 py-3 hover:bg-muted/20 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{d.tag}</span>
                    {d.net === 'Mainnet' ? (
                      <Badge className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0">
                        Mainnet
                      </Badge>
                    ) : d.current ? (
                      <Badge className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0">
                        {lang === 'en' ? 'Active' : lang === 'es' ? 'Activo' : 'Ativo'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {lang === 'en' ? 'Previous' : lang === 'es' ? 'Anterior' : 'Anterior'}
                      </Badge>
                    )}
                  </div>
                  <p className="font-mono text-[11px] text-muted-foreground break-all mt-1">{d.id}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{(d.note as Desc)[lang]}</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
              </a>
            ))}
          </div>
        </section>

        <Separator />

        <section>
          <h2 className="text-base font-semibold mb-4">{ZK_JWT_COPY.repos[lang]}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {REPOS.map((r) => (
              <a
                key={r.url}
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 hover:bg-muted/20 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.label}</p>
                  <p className="font-mono text-[11px] text-muted-foreground truncate mt-0.5">{r.sub}</p>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
