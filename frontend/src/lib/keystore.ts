const STORE_KEY = 'medvault_keys'

function load(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function saveDocumentKey(documentId: string, keyB64: string): void {
  const store = load()
  store[documentId] = keyB64
  localStorage.setItem(STORE_KEY, JSON.stringify(store))
}

export function getDocumentKey(documentId: string): string | null {
  return load()[documentId] ?? null
}
