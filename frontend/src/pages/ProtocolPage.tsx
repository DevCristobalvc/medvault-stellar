import { MermaidDiagram } from '@/components/MermaidDiagram'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { t, type Lang } from '@/lib/i18n'

interface ProtocolPageProps { lang: Lang }

const CONTRACT_ID = 'CDRD7JXJQ4X5G6N7NK5JDRZPVVXCTRWY3CYTKXUC64TCWZHG5DDJPJCE'

const ENDPOINTS = [
  { fn: 'register_document', auth: 'Doctor',   storage: 'Persistent', desc: { en: 'Register encrypted CID on-chain', es: 'Registra CID cifrado on-chain', pt: 'Registra CID cifrado on-chain' } },
  { fn: 'grant_access',      auth: 'Patient',  storage: 'Temporary',  desc: { en: 'Generate time-bound access token', es: 'Genera token de acceso temporizado', pt: 'Gera token de acesso temporizado' } },
  { fn: 'verify_access',     auth: 'None',     storage: 'Read',       desc: { en: 'Check token validity and expiry', es: 'Verifica validez y expiración del token', pt: 'Verifica validade e expiração do token' } },
  { fn: 'revoke_access',     auth: 'Patient',  storage: 'Temporary',  desc: { en: 'Delete token before expiry', es: 'Elimina el token antes de expirar', pt: 'Elimina o token antes de expirar' } },
  { fn: 'log_access',        auth: 'Doctor',   storage: 'Persistent', desc: { en: 'Record access event in audit log', es: 'Registra evento de acceso en audit log', pt: 'Registra evento de acesso no audit log' } },
  { fn: 'get_audit_log',     auth: 'Patient',  storage: 'Read',       desc: { en: "Retrieve patient's access history", es: 'Obtiene historial de accesos del paciente', pt: 'Obtém histórico de acessos do paciente' } },
  { fn: 'get_document',      auth: 'None',     storage: 'Read',       desc: { en: 'Get document metadata by ID', es: 'Obtiene metadata del documento por ID', pt: 'Obtém metadados do documento por ID' } },
  { fn: 'get_token_info',    auth: 'None',     storage: 'Read',       desc: { en: 'Resolve document_id from token', es: 'Resuelve document_id desde el token', pt: 'Resolve document_id a partir do token' } },
  { fn: 'get_patient_documents', auth: 'Patient', storage: 'Read',   desc: { en: 'List all document IDs for a patient', es: 'Lista todos los IDs de documentos del paciente', pt: 'Lista todos os IDs de documentos do paciente' } },
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

const CONTRACT = 'CC7XAXGFCQ73Y2U3RCA6OSSQRJCQCDAAIYFE2U7PHFRQOXMGABG5PGOF'
const server = new rpc.Server('https://soroban-testnet.stellar.org')
const contract = new Contract(CONTRACT)

// Register a document
const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
  .addOperation(contract.call('register_document', doctorAddr, patientAddr, cidScVal, docTypeScVal))
  .setTimeout(30).build()

const prepared = await server.prepareTransaction(tx)
// → sign with Freighter, submit`

type Desc = { en: string; es: string; pt: string }

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
      </div>
    </div>
  )
}
