import { useState, useCallback } from 'react'
import type { Lang } from '@/lib/i18n'

const STORAGE_KEY = 'medvault_lang'

function getInitial(): Lang {
  const stored = localStorage.getItem(STORAGE_KEY) as Lang | null
  if (stored === 'en' || stored === 'es' || stored === 'pt') return stored
  const browser = navigator.language.slice(0, 2).toLowerCase()
  if (browser === 'es') return 'es'
  if (browser === 'pt') return 'pt'
  return 'en'
}

export function useLanguage() {
  const [lang, setLangState] = useState<Lang>(getInitial)

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem(STORAGE_KEY, l)
    setLangState(l)
  }, [])

  return { lang, setLang }
}
