import { describe, it, expect } from 'vitest'
import { translations, t, LANGUAGES, type Lang } from '../lib/i18n'

const LANGS: Lang[] = ['en', 'es', 'pt']

describe('i18n', () => {
  it('exposes the three supported languages', () => {
    expect(LANGUAGES.map((l) => l.code)).toEqual(['en', 'es', 'pt'])
  })

  it('every key has a non-empty translation in en, es and pt', () => {
    const missing: string[] = []
    for (const [section, entries] of Object.entries(translations)) {
      for (const [key, value] of Object.entries(entries as Record<string, Record<Lang, string>>)) {
        for (const lang of LANGS) {
          const text = value[lang]
          if (typeof text !== 'string' || text.trim().length === 0) {
            missing.push(`${section}.${key}.${lang}`)
          }
        }
      }
    }
    expect(missing).toEqual([])
  })

  it('t() returns the value for the requested language', () => {
    expect(t('nav', 'home', 'en')).toBe('Home')
    expect(t('nav', 'home', 'es')).toBe('Inicio')
    expect(t('nav', 'home', 'pt')).toBe('Início')
  })

  it('t() falls back to the key when it does not exist', () => {
    expect(t('nav', 'nonexistent', 'es')).toBe('nonexistent')
  })
})
