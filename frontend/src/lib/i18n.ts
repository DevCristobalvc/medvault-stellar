export type Lang = 'en' | 'es' | 'pt'

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'pt', label: 'PT' },
]

const translations = {
  nav: {
    home:       { en: 'Home',      es: 'Inicio',      pt: 'Início' },
    problem:    { en: 'Problem',   es: 'Problema',    pt: 'Problema' },
    protocol:   { en: 'Protocol',  es: 'Protocolo',   pt: 'Protocolo' },
    vault:      { en: 'My Vault',  es: 'Mi Bóveda',   pt: 'Meu Cofre' },
    doctor:     { en: 'Doctor',    es: 'Doctor',      pt: 'Médico' },
    hackathon:  { en: 'Stellar PULSO', es: 'Stellar PULSO', pt: 'Stellar PULSO' },
  },
  home: {
    badge:    { en: 'Built on Stellar Testnet', es: 'Construido en Stellar Testnet', pt: 'Construído na Stellar Testnet' },
    headline: { en: 'Your body, your records', es: 'Tu cuerpo, tus datos', pt: 'Seu corpo, seus dados' },
    sub:      { en: 'MedVault is sovereign medical record infrastructure. AES-256 encrypted, IPFS stored, access governed by time-bound smart contracts on Stellar.', es: 'MedVault es infraestructura soberana de historias clínicas. Cifrado AES-256, almacenado en IPFS, acceso gobernado por contratos inteligentes en Stellar.', pt: 'MedVault é infraestrutura soberana de prontuários médicos. Cifrado AES-256, armazenado no IPFS, acesso governado por contratos inteligentes na Stellar.' },
    cta_vault:   { en: 'Open my Vault',    es: 'Abrir mi Bóveda',    pt: 'Abrir meu Cofre' },
    cta_upload:  { en: 'Upload a Record',  es: 'Subir Documento',    pt: 'Enviar Documento' },
    f1_title:    { en: 'Sovereign records',   es: 'Datos soberanos',       pt: 'Dados soberanos' },
    f1_desc:     { en: 'Records are encrypted before leaving the device. Only you decide who reads them.', es: 'Los datos se cifran antes de salir del dispositivo. Solo tú decides quién los lee.', pt: 'Os dados são cifrados antes de sair do dispositivo. Só você decide quem os lê.' },
    f2_title:    { en: 'Time-bound access',   es: 'Acceso temporizado',    pt: 'Acesso temporizado' },
    f2_desc:     { en: 'Generate a QR that grants access for 1 hour, 24 hours, or 7 days — then it expires on-chain automatically.', es: 'Genera un QR que otorga acceso por 1 hora, 24 horas o 7 días — luego expira automáticamente on-chain.', pt: 'Gere um QR que concede acesso por 1 hora, 24 horas ou 7 dias — depois expira automaticamente on-chain.' },
    f3_title:    { en: 'Immutable audit log', es: 'Registro inmutable',    pt: 'Registro imutável' },
    f3_desc:     { en: 'Every access is written to Stellar. You always know who read your data, from which wallet, and when.', es: 'Cada acceso queda registrado en Stellar. Siempre sabes quién leyó tus datos, desde qué wallet y cuándo.', pt: 'Cada acesso é registrado na Stellar. Você sempre sabe quem leu seus dados, de qual carteira e quando.' },
  },
  problem: {
    badge:    { en: 'The Problem', es: 'El Problema', pt: 'O Problema' },
    headline: { en: 'Medical history is broken', es: 'La historia clínica está rota', pt: 'O prontuário médico está quebrado' },
    sub:      { en: 'In Latin America, medical records live in silos. Patients carry paper, doctors call each other, and data disappears. The cost is measured in lives.', es: 'En América Latina, las historias clínicas viven en silos. Los pacientes llevan papel, los médicos se llaman entre sí, y los datos desaparecen. El costo se mide en vidas.', pt: 'Na América Latina, os prontuários vivem em silos. Pacientes carregam papel, médicos ligam uns para os outros, e os dados desaparecem. O custo se mede em vidas.' },
    stat1_n:  { en: '70%', es: '70%', pt: '70%' },
    stat1_l:  { en: 'of Colombian doctors operate with vulnerable systems susceptible to ransomware', es: 'de los médicos colombianos opera con sistemas vulnerables a ransomware', pt: 'dos médicos colombianos operam com sistemas vulneráveis a ransomware' },
    stat2_n:  { en: '50%', es: '50%', pt: '50%' },
    stat2_l:  { en: 'lose time with incomplete or incompatible referrals every week', es: 'pierden tiempo con remisiones incompletas o incompatibles cada semana', pt: 'perdem tempo com encaminhamentos incompletos ou incompatíveis toda semana' },
    stat3_n:  { en: '85%', es: '85%', pt: '85%' },
    stat3_l:  { en: 'of surveyed doctors willing to migrate to a sovereign alternative', es: 'de los médicos encuestados dispuesto a migrar a una alternativa soberana', pt: 'dos médicos pesquisados dispostos a migrar para uma alternativa soberana' },
    p1_title: { en: 'Broken infrastructure', es: 'Infraestructura rota', pt: 'Infraestrutura quebrada' },
    p1_desc:  { en: 'Hospital systems are isolated. Data does not travel with the patient. Every new visit starts from scratch. Doctors make decisions without context.', es: 'Los sistemas hospitalarios están aislados. Los datos no viajan con el paciente. Cada nueva consulta empieza desde cero. Los médicos toman decisiones sin contexto.', pt: 'Os sistemas hospitalares são isolados. Os dados não viajam com o paciente. Cada nova consulta começa do zero. Os médicos tomam decisões sem contexto.' },
    p2_title: { en: 'Operational chaos', es: 'Caos operativo', pt: 'Caos operacional' },
    p2_desc:  { en: 'Referrals arrive incomplete, faxed, or by phone. The doctor spends more time chasing records than treating patients. This is a systemic failure.', es: 'Las remisiones llegan incompletas, por fax o por teléfono. El médico pasa más tiempo buscando registros que atendiendo pacientes. Es una falla sistémica.', pt: 'Os encaminhamentos chegam incompletos, por fax ou por telefone. O médico passa mais tempo buscando registros do que atendendo pacientes. É uma falha sistêmica.' },
    p3_title: { en: 'Legal exposure', es: 'Exposición legal', pt: 'Exposição legal' },
    p3_desc:  { en: 'Under Colombian law (SIC), institutions that expose patient data face heavy fines. Yet most use systems with zero encryption and no access logs.', es: 'Bajo la ley colombiana (SIC), las instituciones que exponen datos de pacientes enfrentan multas cuantiosas. Sin embargo, la mayoría usa sistemas sin cifrado y sin logs de acceso.', pt: 'Sob a lei colombiana (SIC), instituições que expõem dados de pacientes enfrentam multas pesadas. No entanto, a maioria usa sistemas sem criptografia e sem logs de acesso.' },
    solution: { en: 'The solution is not another EHR. It is sovereign infrastructure.', es: 'La solución no es otro EHR. Es infraestructura soberana.', pt: 'A solução não é outro prontuário eletrônico. É infraestrutura soberana.' },
  },
  protocol: {
    badge:     { en: 'MedVault Protocol', es: 'Protocolo MedVault', pt: 'Protocolo MedVault' },
    headline:  { en: 'Not an app. Infrastructure.', es: 'No es una aplicación. Es infraestructura.', pt: 'Não é um aplicativo. É infraestrutura.' },
    sub:       { en: 'MedVault is a Blockchain-as-a-Service protocol for sovereign medical data. Any EHR or clinic system can integrate it via the Soroban contract interface.', es: 'MedVault es un protocolo Blockchain-as-a-Service para datos médicos soberanos. Cualquier EHR o sistema clínico puede integrarlo vía la interfaz del contrato Soroban.', pt: 'MedVault é um protocolo Blockchain-as-a-Service para dados médicos soberanos. Qualquer sistema de prontuário pode integrá-lo via a interface do contrato Soroban.' },
    endpoints: { en: 'Contract Endpoints', es: 'Endpoints del Contrato', pt: 'Endpoints do Contrato' },
    arch:      { en: 'System Architecture', es: 'Arquitectura del Sistema', pt: 'Arquitetura do Sistema' },
    flow:      { en: 'Access Flow', es: 'Flujo de Acceso', pt: 'Fluxo de Acesso' },
    integrate: { en: 'Integrate MedVault', es: 'Integrar MedVault', pt: 'Integrar MedVault' },
    integrate_desc: { en: 'Any system can interact with the MedVault contract directly. No SDK required — just Stellar SDK and a Freighter-compatible wallet.', es: 'Cualquier sistema puede interactuar directamente con el contrato MedVault. Sin SDK propio — solo Stellar SDK y una wallet compatible con Freighter.', pt: 'Qualquer sistema pode interagir diretamente com o contrato MedVault. Sem SDK próprio — apenas o Stellar SDK e uma carteira compatível com Freighter.' },
  },
  hackathon: {
    badge:    { en: 'Stellar PULSO Hackathon', es: 'Stellar PULSO Hackathon', pt: 'Stellar PULSO Hackathon' },
    headline: { en: 'Stellar PULSO — NearX + SDF', es: 'Stellar PULSO — NearX + SDF', pt: 'Stellar PULSO — NearX + SDF' },
    sub:      { en: 'MedVault was built for the Stellar PULSO Hackathon. This page contains all submission materials.', es: 'MedVault fue construido para el Stellar PULSO Hackathon. Esta página contiene todos los materiales de entrega.', pt: 'MedVault foi construído para o Stellar PULSO Hackathon. Esta página contém todos os materiais de entrega.' },
    resources:  { en: 'Resources', es: 'Recursos', pt: 'Recursos' },
    deck:       { en: 'Pitch Deck', es: 'Pitch Deck', pt: 'Pitch Deck' },
    video:      { en: 'Demo Video', es: 'Video Demo', pt: 'Vídeo Demo' },
    repo:       { en: 'Repository', es: 'Repositorio', pt: 'Repositório' },
    contract:   { en: 'Contract on Testnet', es: 'Contrato en Testnet', pt: 'Contrato na Testnet' },
    discovery:  { en: 'Customer Discovery', es: 'Customer Discovery', pt: 'Customer Discovery' },
    discovery_desc: { en: '3 recorded interviews with doctors and patients, demonstrating the real problem.', es: '3 entrevistas grabadas con médicos y pacientes, demostrando el problema real.', pt: '3 entrevistas gravadas com médicos e pacientes, demonstrando o problema real.' },
    pending:    { en: 'Coming soon', es: 'Próximamente', pt: 'Em breve' },
  },
} as const

export type TranslationKey = keyof typeof translations

export function t(section: TranslationKey, key: string, lang: Lang): string {
  const s = translations[section] as Record<string, Record<Lang, string>>
  return s[key]?.[lang] ?? s[key]?.['en'] ?? key
}

export { translations }
