const STORE_KEY = 'medvault_doctor_records'

export interface DoctorRecord {
  tokenId: string
  documentId: string
  cid: string
  docType: string
  patientAddress: string
  createdAt: number
  accessedAt: number
}

function load(): DoctorRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function save(records: DoctorRecord[]): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(records))
}

export function saveDoctorRecord(record: DoctorRecord): void {
  const existing = load()
  const idx = existing.findIndex((r) => r.tokenId === record.tokenId)
  if (idx >= 0) {
    existing[idx] = record
  } else {
    existing.unshift(record)
  }
  save(existing)
}

export function getDoctorRecords(): DoctorRecord[] {
  return load().sort((a, b) => b.accessedAt - a.accessedAt)
}
