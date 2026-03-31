'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { translations, type Lang } from '@/lib/i18n'

type LanguageContextType = {
  lang: Lang
  setLang: (l: Lang) => void
  t: typeof translations.it
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'it',
  setLang: () => {},
  t: translations.it,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('it')

  useEffect(() => {
    const stored = localStorage.getItem('lf_lang') as Lang | null
    if (stored === 'it' || stored === 'en') setLangState(stored)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('lf_lang', l)
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] as typeof translations.it }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
