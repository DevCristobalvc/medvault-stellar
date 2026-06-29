const STORE_KEY = 'medvault_document_keys'

function load(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function saveDocumentKey(cid: string, keyB64: string): void {
  const store = load()
  store[cid] = keyB64
  localStorage.setItem(STORE_KEY, JSON.stringify(store))
}

export function getStoredDocumentKey(cid: string): string | null {
  return load()[cid] ?? null
}
