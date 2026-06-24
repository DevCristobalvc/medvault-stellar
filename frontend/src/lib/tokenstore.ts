const STORE_KEY = 'medvault_tokens'

export interface ActiveToken {
  tokenId: string
  documentId: string
  doctorAddress: string
  expiresAt: number
  grantedAt: number
}

function load(): ActiveToken[] {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function save(tokens: ActiveToken[]): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(tokens))
}

export function saveActiveToken(token: Omit<ActiveToken, 'grantedAt'>): void {
  const tokens = load()
  tokens.push({ ...token, grantedAt: Math.floor(Date.now() / 1000) })
  save(tokens)
}

export function getActiveTokens(documentId: string): ActiveToken[] {
  const now = Math.floor(Date.now() / 1000)
  return load().filter((t) => t.documentId === documentId && t.expiresAt > now)
}

export function getAllActiveTokens(): ActiveToken[] {
  const now = Math.floor(Date.now() / 1000)
  return load().filter((t) => t.expiresAt > now)
}

export function removeToken(tokenId: string): void {
  save(load().filter((t) => t.tokenId !== tokenId))
}
