'use client'

import { useState, useEffect, useRef } from 'react'
import { Volume2, Square, Eye, EyeOff, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const ACCENTS = [
  { code: 'en-GB', flag: '🇬🇧', label: 'British' },
  { code: 'en-US', flag: '🇺🇸', label: 'American' },
  { code: 'en-AU', flag: '🇦🇺', label: 'Australian' },
  { code: 'en-IN', flag: '🇮🇳', label: 'Indian' },
  { code: 'en-CA', flag: '🇨🇦', label: 'Canadian' },
  { code: 'en-IE', flag: '🇮🇪', label: 'Irish' },
] as const

type AccentCode = (typeof ACCENTS)[number]['code']

// Normalize lang string: "en_GB" → "en-gb", "en-GB" → "en-gb"
function norm(s: string) {
  return s.toLowerCase().replace('_', '-')
}

function pickVoice(lang: AccentCode): SpeechSynthesisVoice | null {
  // Always read fresh from the API — not from stale state
  const voices = window.speechSynthesis.getVoices()
  const target = norm(lang)

  // 1. Exact locale match — prefer Google / neural voices
  const exact = voices.filter(v => norm(v.lang) === target)
  if (exact.length) {
    return exact.find(v => /google|neural|natural|enhanced/i.test(v.name)) ?? exact[0]
  }

  // 2. Same language, any region (e.g. en-CA → en-GB or en-US)
  const prefix = target.split('-')[0]
  const regional = voices.filter(v => norm(v.lang).startsWith(prefix + '-'))
  if (regional.length) {
    return regional.find(v => /google|neural|natural|enhanced/i.test(v.name)) ?? regional[0]
  }

  return null
}

export function TTSPlayer({
  text,
  showTranscriptToggle = true,
}: {
  text: string
  showTranscriptToggle?: boolean
}) {
  const [accent, setAccent] = useState<AccentCode>('en-GB')
  const [speaking, setSpeaking] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [accentOpen, setAccentOpen] = useState(false)
  const [availableCodes, setAvailableCodes] = useState<Set<string>>(new Set())
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Track which accent codes have a matching voice (for UI feedback)
  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    function updateAvailable() {
      const voices = window.speechSynthesis.getVoices()
      const found = new Set<string>()
      for (const a of ACCENTS) {
        const t = norm(a.code)
        if (voices.some(v => norm(v.lang) === t)) found.add(a.code)
      }
      setAvailableCodes(found)
    }
    updateAvailable()
    window.speechSynthesis.onvoiceschanged = updateAvailable
    return () => { window.speechSynthesis.onvoiceschanged = null }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAccentOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function speak() {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()

    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.88

    const voice = pickVoice(accent)
    if (voice) {
      utt.voice = voice
      utt.lang = voice.lang  // use the exact lang string the voice expects
    } else {
      utt.lang = accent       // fallback: let the browser pick
    }

    utt.onstart = () => setSpeaking(true)
    utt.onend = () => setSpeaking(false)
    utt.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utt)
  }

  function stop() {
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }

  const selectedAccent = ACCENTS.find(a => a.code === accent)!

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 bg-edu-blue-50 border border-edu-blue-100 rounded-xl p-3 flex-wrap">

        {/* Play / Stop */}
        <button
          type="button"
          onClick={speaking ? stop : speak}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-edu-blue-500 text-white text-sm font-medium hover:bg-edu-blue-600 transition-colors flex-shrink-0"
        >
          {speaking
            ? <><Square className="w-3.5 h-3.5" /> Ferma</>
            : <><Volume2 className="w-4 h-4" /> Ascolta</>}
        </button>

        {/* Accent picker */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setAccentOpen(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all',
              accentOpen
                ? 'border-edu-blue-300 bg-white text-navy-700'
                : 'border-edu-blue-200 bg-white/70 text-navy-700 hover:border-edu-blue-300',
            )}
          >
            <span>{selectedAccent.flag}</span>
            <span>{selectedAccent.label}</span>
            <ChevronDown className={cn('w-3 h-3 text-muted-foreground transition-transform', accentOpen && 'rotate-180')} />
          </button>

          {accentOpen && (
            <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-cream-200 rounded-xl shadow-lg overflow-hidden min-w-[150px]">
              {ACCENTS.map(a => {
                const available = availableCodes.has(a.code)
                return (
                  <button
                    key={a.code}
                    type="button"
                    onClick={() => {
                      setAccent(a.code)
                      setAccentOpen(false)
                      if (speaking) stop()
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors hover:bg-cream-50',
                      accent === a.code ? 'bg-edu-blue-50 text-edu-blue-700 font-medium' : 'text-navy-700',
                    )}
                  >
                    <span>{a.flag}</span>
                    <span className="flex-1">{a.label}</span>
                    {!available && (
                      <span className="text-[10px] text-muted-foreground/50">~</span>
                    )}
                  </button>
                )
              })}
              <p className="text-[10px] text-muted-foreground/60 px-3 py-1.5 border-t border-cream-100">
                ~ = voce simile disponibile
              </p>
            </div>
          )}
        </div>

        {/* Speaking indicator */}
        {speaking && (
          <span className="text-xs text-edu-blue-500 animate-pulse">🔊 In riproduzione...</span>
        )}

        {/* Show/hide transcript */}
        {showTranscriptToggle && (
          <button
            type="button"
            onClick={() => setShowTranscript(v => !v)}
            className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-navy-700 transition-colors"
          >
            {showTranscript
              ? <><EyeOff className="w-3.5 h-3.5" /> Nascondi testo</>
              : <><Eye className="w-3.5 h-3.5" /> Mostra testo</>}
          </button>
        )}
      </div>

      {showTranscript && (
        <div className="bg-cream-50 rounded-xl p-3 text-sm text-navy-700 leading-relaxed border border-cream-200 max-h-48 overflow-y-auto">
          {text}
        </div>
      )}
    </div>
  )
}
