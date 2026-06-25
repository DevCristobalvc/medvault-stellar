import { useState } from 'react'
import { MermaidDiagram } from '@/components/MermaidDiagram'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { t, type Lang } from '@/lib/i18n'
import { verifyZkpProof } from '@/lib/stellar'
import { ZKP_DEMO_PROOF } from '@/lib/zkpProof'

interface ProtocolPageProps { lang: Lang }

const CONTRACT_ID = 'CAUUBZYILFYVHS2IYJDMXR4GUZ2LLYVWR25W7C5PXC7A5PF3QHIUWH2M'

const ENDPOINTS = [
  { fn: 'register_document', auth: 'Doctor',   storage: 'Persistent', desc: { en: 'Register encrypted CID on-chain', es: 'Registra CID cifrado on-chain', pt: 'Registra CID cifrado on-chain' } },
  { fn: 'grant_access',      auth: 'Patient',  storage: 'Temporary',  desc: { en: 'Generate time-bound access token', es: 'Genera token de acceso temporizado', pt: 'Gera token de acesso temporizado' } },
  { fn: 'verify_access',     auth: 'None',     storage: 'Read',       desc: { en: 'Check token validity and expiry', es: 'Verifica validez y expiración del token', pt: 'Verifica validade e expiração do token' } },
  { fn: 'revoke_access',     auth: 'Patient',  storage: 'Temporary',  desc: { en: 'Delete token before expiry', es: 'Elimina el token antes de expirar', pt: 'Elimina o token antes de expirar' } },
  { fn: 'log_access',        auth: 'Doctor',   storage: 'Persistent', desc: { en: 'Record access event in audit log', es: 'Registra evento de acceso en audit log', pt: 'Registra evento de acesso no audit log' } },
  { fn: 'get_audit_log',     auth: 'None',     storage: 'Read',       desc: { en: "Retrieve patient's access history", es: 'Obtiene historial de accesos del paciente', pt: 'Obtém histórico de acessos do paciente' } },
  { fn: 'get_document',      auth: 'None',     storage: 'Read',       desc: { en: 'Get document metadata by ID', es: 'Obtiene metadata del documento por ID', pt: 'Obtém metadados do documento por ID' } },
  { fn: 'get_token_info',    auth: 'None',     storage: 'Read',       desc: { en: 'Resolve document_id from token', es: 'Resuelve document_id desde el token', pt: 'Resolve document_id a partir do token' } },
  { fn: 'get_patient_documents', auth: 'None',  storage: 'Read',   desc: { en: 'List all document IDs for a patient', es: 'Lista todos los IDs de documentos del paciente', pt: 'Lista todos os IDs de documentos do paciente' } },
  { fn: 'get_encrypted_key', auth: 'None',    storage: 'Read',       desc: { en: 'Fetch on-chain encrypted AES key (KEM)', es: 'Obtiene la AES key cifrada on-chain (KEM)', pt: 'Obtém a AES key cifrada on-chain (KEM)' } },
  { fn: 'get_doctor_tokens', auth: 'None',    storage: 'Read',       desc: { en: 'List access tokens issued to a doctor', es: 'Lista los tokens de acceso emitidos a un médico', pt: 'Lista os tokens de acesso emitidos a um médico' } },
  { fn: 'verify_zkp_proof',  auth: 'None',     storage: 'Read',      desc: { en: 'Groth16 verification via BLS12-381 pairing (CAP-0052)', es: 'Verificación Groth16 vía pairing BLS12-381 (CAP-0052)', pt: 'Verificação Groth16 via pairing BLS12-381 (CAP-0052)' } },
]

const ARCH_DIAGRAM = `flowchart LR
  subgraph Client["Client (Browser)"]
    W[Freighter Wallet]
    E[AES-256-GCM]
  end
  subgraph Storage["Decentralized Storage"]
    I[IPFS via Pinata]
    S[Stellar Soroban]
  end
  W -->|sign tx| S
  E -->|ciphertext| I
  I -->|CID| S
  S -->|audit log| S`

const ACCESS_DIAGRAM = `sequenceDiagram
  participant D as Doctor
  participant P as Patient
  participant SC as Soroban
  participant IP as IPFS

  D->>SC: register_document(CID)
  P->>SC: grant_access(doctor, expires)
  SC-->>P: token_id
  P-->>D: QR with token + key
  D->>SC: verify_access(token)
  SC-->>D: true
  D->>IP: download(CID)
  IP-->>D: ciphertext
  D->>D: decrypt in RAM
  D->>SC: log_access(token)`

const INTEGRATION_CODE = `import { Contract, Networks, rpc } from '@stellar/stellar-sdk'

const CONTRACT = 'CAUUBZYILFYVHS2IYJDMXR4GUZ2LLYVWR25W7C5PXC7A5PF3QHIUWH2M'
const server = new rpc.Server('https://soroban-testnet.stellar.org')
const contract = new Contract(CONTRACT)

// Register a document
const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
  .addOperation(contract.call('register_document', doctorAddr, patientAddr, cidScVal, docTypeScVal))
  .setTimeout(30).build()

const prepared = await server.prepareTransaction(tx)
// → sign with Freighter, submit`

type Desc = { en: string; es: string; pt: string }

const ZK_COPY = {
  title: { en: 'ZK Merkle membership — live on-chain', es: 'Membresía Merkle ZK — on-chain en vivo', pt: 'Associação Merkle ZK — on-chain ao vivo' },
  desc: {
    en: 'A Groth16 proof (BLS12-381) that a wallet belongs to the authorized-doctor set, without revealing which one. Verified live by the deployed contract via env.crypto().bls12_381().pairing_check (CAP-0052).',
    es: 'Una prueba Groth16 (BLS12-381) de que una wallet pertenece al conjunto de médicos autorizados, sin revelar cuál. Verificada en vivo por el contrato vía env.crypto().bls12_381().pairing_check (CAP-0052).',
    pt: 'Uma prova Groth16 (BLS12-381) de que uma wallet pertence ao conjunto de médicos autorizados, sem revelar qual. Verificada ao vivo pelo contrato via env.crypto().bls12_381().pairing_check (CAP-0052).',
  },
  button: { en: 'Verify proof on-chain', es: 'Verificar prueba on-chain', pt: 'Verificar prova on-chain' },
  verifying: { en: 'Verifying on Soroban…', es: 'Verificando en Soroban…', pt: 'Verificando no Soroban…' },
  ok: { en: 'Proof accepted — pairing check passed', es: 'Prueba aceptada — pairing check válido', pt: 'Prova aceita — pairing check válido' },
  bad: { en: 'Proof rejected', es: 'Prueba rechazada', pt: 'Prova rejeitada' },
  rootLabel: { en: 'Public input (Merkle root)', es: 'Input público (raíz Merkle)', pt: 'Input público (raiz Merkle)' },
}

function ZkVerifyPanel({ lang }: { lang: Lang }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'bad' | 'error'>('idle')
  const [error, setError] = useState('')

  async function run() {
    setStatus('loading')
    setError('')
    try {
      const ok = await verifyZkpProof(ZKP_DEMO_PROOF)
      setStatus(ok ? 'ok' : 'bad')
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="rounded-xl border border-border p-4 flex flex-col gap-4">
      <p className="text-sm text-muted-foreground leading-relaxed">{ZK_COPY.desc[lang]}</p>

      <div className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{ZK_COPY.rootLabel[lang]}</span>
        <code className="font-mono text-[11px] break-all bg-muted/50 rounded-md px-3 py-2 text-foreground">
          0x{ZKP_DEMO_PROOF.merkleRoot}
        </code>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={run} disabled={status === 'loading'} size="sm">
          {status === 'loading' ? ZK_COPY.verifying[lang] : ZK_COPY.button[lang]}
        </Button>
        {status === 'ok' && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600">
            <span className="w-2 h-2 rounded-full bg-green-500" /> {ZK_COPY.ok[lang]}
          </span>
        )}
        {status === 'bad' && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
            <span className="w-2 h-2 rounded-full bg-red-500" /> {ZK_COPY.bad[lang]}
          </span>
        )}
        {status === 'error' && (
          <span className="text-xs text-red-600 break-all">{error}</span>
        )}
      </div>
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
                  <tr key={ep.fn} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-primary">{ep.fn}</td>
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
          <h2 className="text-base font-semibold mb-4">{t('protocol', 'arch', lang)}</h2>
          <MermaidDiagram chart={ARCH_DIAGRAM} id="arch" />
        </section>

        <section>
          <h2 className="text-base font-semibold mb-4">{t('protocol', 'flow', lang)}</h2>
          <MermaidDiagram chart={ACCESS_DIAGRAM} id="flow" />
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

        <Separator />

        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-semibold">Cryptography Roadmap</h2>
            <Badge variant="outline" className="text-xs">v1 → v3</Badge>
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
                version: 'v2 (deployed)',
                title: 'On-chain encrypted key (KEM)',
                desc: 'AES key encrypted with a random wrapping key. Encrypted key stored on Soroban. Only #wk= travels in URL. Two-factor: blockchain + URL.',
                status: 'live',
              },
              {
                version: 'v3 (planned)',
                title: 'ECIES with Stellar public key',
                desc: 'Wrapping key derived via X25519 ECDH using doctor\'s Stellar public key. No key in URL. Requires Freighter to expose X25519 derivation.',
                status: 'planned',
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
      </div>
    </div>
  )
}
