'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage()

  return (
    <div className="flex items-center gap-0.5 bg-cream-200/60 rounded-lg p-0.5">
      <button
        onClick={() => setLang('it')}
        className={cn(
          'text-xs font-semibold px-2 py-1 rounded-md transition-all duration-150',
          lang === 'it'
            ? 'bg-white text-navy-700 shadow-sm'
            : 'text-navy-700/45 hover:text-navy-700',
        )}
      >
        IT
      </button>
      <button
        onClick={() => setLang('en')}
        className={cn(
          'text-xs font-semibold px-2 py-1 rounded-md transition-all duration-150',
          lang === 'en'
            ? 'bg-white text-navy-700 shadow-sm'
            : 'text-navy-700/45 hover:text-navy-700',
        )}
      >
        EN
      </button>
    </div>
  )
}
