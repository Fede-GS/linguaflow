'use client'

import { useState, useEffect, useMemo } from 'react'
import { EXERCISE_TYPE_LABELS } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { TTSPlayer } from './TTSPlayer'
import { ConversationSimChat } from './ConversationSimChat'

type Props = { type: string; content: Record<string, unknown>; skillFocus?: string }
const str = (v: unknown) => String(v ?? '')
const num = (v: unknown) => Number(v ?? 0)

export function ExercisePreview({ type, content, skillFocus }: Props) {
  return (
    <div className="space-y-4">
      <div className="text-xs font-medium text-coral-500 uppercase tracking-wide">{EXERCISE_TYPE_LABELS[type] ?? type}</div>
      {!!content.instructions && (
        <p className="text-sm text-muted-foreground italic">{str(content.instructions)}</p>
      )}
      <PreviewBody type={type} content={content} skillFocus={skillFocus} />
    </div>
  )
}

function PreviewBody({ type, content, skillFocus }: Props) {
  const isListening = skillFocus === 'LISTENING'
  switch (type) {
    case 'FILL_BLANK':
    case 'CLOZE': {
      return <FillBlankInteractive content={content} />
    }

    case 'WORD_FORMATION': {
      // schema: items: [{ id, sentence: "frase con ___", baseWord: "ROOT", answer: "formed" }]
      const items = (content.items || []) as Array<{ id: string; sentence: string; baseWord: string; answer: string }>
      return (
        <div className="space-y-3">
          {items.map((item, i) => {
            const displayed = (item.sentence || '').replace('___', `[${item.answer}]`)
            return (
              <div key={item.id} className="space-y-0.5">
                <p className="text-sm text-navy-700">
                  <span className="text-muted-foreground">{i + 1}. </span>{displayed}
                  <span className="text-xs text-muted-foreground ml-2">({item.baseWord})</span>
                </p>
                <p className="text-xs text-green-700 ml-4">→ {item.answer}</p>
              </div>
            )
          })}
        </div>
      )
    }
    case 'MULTIPLE_CHOICE': {
      const questions = (content.questions || []) as Array<{ id: string; text: string; options: Array<{ id: string; text: string }>; correctOptionId: string }>
      return (
        <div className="space-y-4">
          {!!content.text && (
            isListening
              ? <TTSPlayer text={str(content.text)} />
              : <p className="text-xs text-muted-foreground italic bg-cream-50 p-3 rounded-xl">{str(content.text)}</p>
          )}
          {questions.map((q, i: number) => (
            <div key={q.id} className="space-y-2">
              <p className="text-sm font-medium text-navy-700">{i + 1}. {q.text}</p>
              <div className="grid grid-cols-2 gap-2">
                {q.options.map((opt: { id: string; text: string }) => (
                  <div key={opt.id} className={`text-xs p-2 rounded-lg border ${opt.id === q.correctOptionId ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-cream-200 text-navy-700'}`}>
                    {opt.id.toUpperCase()}. {opt.text}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )
    }
    case 'MATCHING': {
      const pairs = (content.pairs || []) as Array<{ id: string; left: string; right: string }>
      return (
        <div className="space-y-2">
          {pairs.map((p: { id: string; left: string; right: string }) => (
            <div key={p.id} className="grid grid-cols-2 gap-3">
              <div className="text-sm bg-edu-blue-500/10 text-navy-700 p-2 rounded-lg">{p.left}</div>
              <div className="text-sm bg-cream-100 text-muted-foreground p-2 rounded-lg">{p.right}</div>
            </div>
          ))}
        </div>
      )
    }
    case 'TRUE_FALSE': {
      const statements = (content.statements || []) as Array<{ id: string; statement: string; answer: string }>
      return (
        <div className="space-y-3">
          {!!content.text && (
            isListening
              ? <TTSPlayer text={str(content.text)} />
              : <p className="text-xs text-muted-foreground italic bg-cream-50 p-3 rounded-xl">{str(content.text)}</p>
          )}
          {statements.map((s: { id: string; statement: string; answer: string }, i: number) => (
            <div key={s.id} className="flex items-start gap-3">
              <span className="text-xs text-muted-foreground flex-shrink-0 mt-1">{i + 1}.</span>
              <p className="text-sm text-navy-700 flex-1">{s.statement}</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${s.answer === 'true' ? 'bg-green-50 text-green-700' : s.answer === 'false' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'}`}>
                {s.answer === 'true' ? 'V' : s.answer === 'false' ? 'F' : 'NG'}
              </span>
            </div>
          ))}
        </div>
      )
    }
    case 'READING_COMP': {
      return <ReadingCompInteractive content={content} />
    }
    case 'LISTENING_COMP': {
      return <ReadingCompInteractive content={content} withAudio />
    }
    case 'ERROR_CORRECTION': {
      const sentences = (content.sentences || []) as Array<{ id: string; incorrect: string; correct: string; errorType: string }>
      return (
        <div className="space-y-3">
          {sentences.map((s: { id: string; incorrect: string; correct: string; errorType: string }, i: number) => (
            <div key={s.id} className="space-y-1">
              <p className="text-sm text-red-600 line-through opacity-70">{i + 1}. {s.incorrect}</p>
              <p className="text-sm text-green-700">✓ {s.correct} <span className="text-xs text-muted-foreground">({s.errorType})</span></p>
            </div>
          ))}
        </div>
      )
    }
    case 'TRANSLATION': {
      const items = (content.items || []) as Array<{ id: string; source: string; target: string }>
      return (
        <div className="space-y-2">
          {items.map((item: { id: string; source: string; target: string }, i: number) => (
            <div key={item.id} className="grid grid-cols-2 gap-2">
              <div className="text-sm bg-white border border-cream-200 p-2 rounded-lg">{i + 1}. {item.source}</div>
              <div className="text-sm bg-green-50 border border-green-100 p-2 rounded-lg text-green-800">{item.target}</div>
            </div>
          ))}
        </div>
      )
    }
    case 'SHORT_ANSWER': {
      const questions = (content.questions || []) as Array<{ id: string; question: string; sampleAnswer: string }>
      return (
        <div className="space-y-4">
          {questions.map((q: { id: string; question: string; sampleAnswer: string }, i: number) => (
            <div key={q.id} className="space-y-1">
              <p className="text-sm font-medium text-navy-700">{i + 1}. {q.question}</p>
              <p className="text-xs text-muted-foreground italic">Risposta modello: {q.sampleAnswer}</p>
            </div>
          ))}
        </div>
      )
    }
    case 'ESSAY': {
      return (
        <div className="space-y-4">
          <div className="bg-cream-50 p-4 rounded-xl">
            <p className="text-sm font-medium text-navy-700 mb-1">Traccia:</p>
            <p className="text-sm text-navy-700">{str(content.prompt)}</p>
            {!!(content.minWords || content.maxWords) && (
              <p className="text-xs text-muted-foreground mt-2">{num(content.minWords)}–{num(content.maxWords)} parole</p>
            )}
          </div>
          {!!content.rubric && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-navy-700">Rubrica di valutazione:</p>
              {Object.entries(content.rubric as Record<string, string>).map(([k, v]) => (
                <div key={k} className="flex gap-2 text-xs">
                  <span className="font-medium text-navy-700 capitalize w-20 flex-shrink-0">{k}:</span>
                  <span className="text-muted-foreground">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }
    case 'REORDER': {
      // schema: sentences: [{ id, words: [...], correctOrder: [...] }]
      const sentences = (content.sentences || content.items || []) as Array<{ id: string; words?: string[]; text?: string; hint?: string }>
      return (
        <div className="space-y-4">
          {sentences.map((s, i) => {
            const words = s.words ?? (s.text ? s.text.split(' ') : [])
            return (
              <div key={s.id} className="space-y-2">
                <p className="text-xs text-muted-foreground">{i + 1}. {s.hint || 'Riordina le parole:'}</p>
                <div className="flex flex-wrap gap-2">
                  {words.map((w, wi) => (
                    <span key={wi} className="text-xs bg-cream-100 border border-cream-200 px-2 py-1 rounded-lg text-navy-700">{w}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    case 'DIALOGUE_COMPLETE': {
      const scenario = content.scenario as string | undefined
      const lines = (content.dialogue || content.lines || []) as Array<{ id: string; speaker: string; text: string; isBlank?: boolean; isGap?: boolean; answer?: string }>
      return (
        <div className="space-y-3">
          {!!scenario && <p className="text-xs text-muted-foreground italic bg-cream-50 p-2 rounded-xl">📍 {scenario}</p>}
          {lines.map((line) => {
            const isBlank = line.isBlank || line.isGap
            const isB = line.speaker === 'B'
            return (
              <div key={line.id} className={`flex gap-2 ${isB ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${isB ? 'bg-coral-500 text-white' : 'bg-edu-blue-500 text-white'}`}>
                  {line.speaker}
                </div>
                <div className={`text-xs px-2.5 py-2 rounded-xl max-w-[80%] ${isBlank ? 'bg-amber-50 border border-amber-200 text-amber-800 italic' : isB ? 'bg-coral-50 border border-coral-100' : 'bg-cream-50 border border-cream-200'} text-navy-700`}>
                  {isBlank ? `[${line.answer || '___'}]` : line.text}
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    case 'DICTATION': {
      const text = content.text as string
      const focusPoints = content.focusPoints as string[] | undefined
      return (
        <div className="space-y-3">
          <TTSPlayer text={text} showTranscriptToggle={false} />
          {focusPoints && focusPoints.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {focusPoints.map((fp, i) => (
                <span key={i} className="text-xs bg-edu-blue-50 text-edu-blue-700 px-2 py-0.5 rounded-full">{fp}</span>
              ))}
            </div>
          )}
        </div>
      )
    }

    case 'CONVERSATION_SIM': {
      return <ConversationSimChat content={content} />
    }

    default: {
      return <pre className="text-xs bg-cream-50 p-3 rounded-xl overflow-auto max-h-80">{JSON.stringify(content, null, 2)}</pre>
    }
  }
}

// ─── Interactive fill-in-the-blank ─────────────────────────────────────────
function FillBlankInteractive({ content }: { content: Record<string, unknown> }) {
  const text = ((content.text || content.passage) as string) ?? ''
  const gaps = (content.gaps || []) as Array<{ id: string; answer: string; hint?: string }>
  const rawWordBank = (content.wordBank as string[] | undefined) ?? gaps.map(g => g.answer)

  const [selectedGapId, setSelectedGapId] = useState<string | null>(null)
  const [gapAnswers, setGapAnswers] = useState<Record<string, string>>({})
  const [availableWords, setAvailableWords] = useState<string[]>([])

  // Reset when a new exercise is loaded (text changes)
  useEffect(() => {
    const shuffled = [...rawWordBank].sort(() => Math.random() - 0.5)
    setAvailableWords(shuffled)
    setGapAnswers({})
    setSelectedGapId(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  const parts = useMemo(() => {
    const result: Array<{ type: 'text'; value: string } | { type: 'gap'; id: string }> = []
    const regex = /___([A-Z_0-9]+)___/g
    let last = 0
    let m: RegExpExecArray | null
    while ((m = regex.exec(text)) !== null) {
      if (m.index > last) result.push({ type: 'text', value: text.slice(last, m.index) })
      result.push({ type: 'gap', id: m[1] })
      last = m.index + m[0].length
    }
    if (last < text.length) result.push({ type: 'text', value: text.slice(last) })
    return result
  }, [text])

  function handleGapClick(gapId: string) {
    const currentWord = gapAnswers[gapId]
    if (currentWord) {
      // Un-fill: return word to bank and select the now-empty gap
      setAvailableWords(prev => [...prev, currentWord])
      setGapAnswers(prev => { const n = { ...prev }; delete n[gapId]; return n })
      setSelectedGapId(gapId)
    } else {
      setSelectedGapId(prev => (prev === gapId ? null : gapId))
    }
  }

  function handleWordClick(word: string, idx: number) {
    if (!selectedGapId) return
    // If the selected gap already had a word, return it to bank
    const existing = gapAnswers[selectedGapId]
    setAvailableWords(prev => {
      const next = [...prev]
      next.splice(idx, 1)
      if (existing) next.push(existing)
      return next
    })
    setGapAnswers(prev => ({ ...prev, [selectedGapId]: word }))
    setSelectedGapId(null)
  }

  return (
    <div className="space-y-4">
      {/* Text with interactive gaps */}
      <p className="text-sm text-navy-700 leading-loose bg-cream-50 p-3 rounded-xl">
        {parts.map((part, i) => {
          if (part.type === 'text') return <span key={i}>{part.value}</span>
          const filled = gapAnswers[part.id]
          const isSelected = selectedGapId === part.id
          return (
            <span
              key={i}
              onClick={() => handleGapClick(part.id)}
              className={cn(
                'inline-block min-w-[64px] px-2 py-0.5 mx-1 rounded-md border-b-2 cursor-pointer text-center align-middle transition-all text-sm',
                filled
                  ? 'border-coral-400 bg-coral-50 text-coral-700 font-medium hover:bg-coral-100'
                  : isSelected
                    ? 'border-navy-500 bg-navy-50 text-navy-400 border-solid animate-pulse'
                    : 'border-dashed border-navy-300 text-transparent select-none hover:border-navy-400',
              )}
            >
              {filled || '\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0\u00a0'}
            </span>
          )
        })}
      </p>

      {/* Word bank */}
      <div className="pt-2 border-t border-cream-200">
        {availableWords.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {availableWords.map((w, i) => (
              <button
                key={i}
                onClick={() => handleWordClick(w, i)}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-full border transition-all',
                  selectedGapId
                    ? 'border-navy-300 bg-white text-navy-700 hover:bg-navy-50 hover:border-coral-400 cursor-pointer'
                    : 'border-cream-200 bg-white text-navy-500 cursor-default',
                )}
              >
                {w}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">Tutti i buchi sono stati riempiti</p>
        )}
        {!selectedGapId && availableWords.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-2">Clicca su un buco per selezionarlo, poi scegli una parola</p>
        )}
      </div>
    </div>
  )
}

// ─── Interactive reading/listening comprehension ───────────────────────────
type RCQuestion = {
  id: string
  question: string
  type?: string
  options?: Array<{ id: string; text: string }>
  correctAnswer: string
}

function ReadingCompInteractive({ content, withAudio = false }: { content: Record<string, unknown>; withAudio?: boolean }) {
  const passage = ((content.passage || content.transcript) as string) ?? ''
  const questions = (content.questions || []) as RCQuestion[]
  const [answers, setAnswers] = useState<Record<string, string>>({})

  function pick(questionId: string, optionId: string) {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }))
  }

  return (
    <div className="space-y-4">
      {/* Audio player (listening) or passage text (reading) */}
      {withAudio
        ? <TTSPlayer text={passage} />
        : <div className="bg-cream-50 p-3 rounded-xl text-sm text-navy-700 leading-relaxed max-h-48 overflow-y-auto">{passage}</div>
      }

      {/* Questions */}
      <div className="space-y-5">
        {questions.map((q, i) => {
          const selected = answers[q.id]
          const hasOptions = q.options && q.options.length > 0

          return (
            <div key={q.id} className="space-y-2">
              <p className="text-sm font-medium text-navy-700">{i + 1}. {q.question}</p>

              {hasOptions ? (
                <div className="space-y-1.5">
                  {q.options!.map(opt => {
                    const isSelected = selected === opt.id
                    const isDimmed = !!selected && !isSelected
                    return (
                      <button
                        key={opt.id}
                        onClick={() => pick(q.id, opt.id)}
                        className={cn(
                          'w-full text-left text-xs px-3 py-2 rounded-lg border transition-all',
                          isSelected
                            ? 'border-coral-400 bg-coral-50 text-coral-700 font-medium'
                            : isDimmed
                              ? 'border-cream-100 bg-cream-50 text-navy-700/25 cursor-pointer'
                              : 'border-cream-200 bg-white text-navy-700 hover:border-navy-300 cursor-pointer',
                        )}
                      >
                        <span className="font-semibold mr-2 uppercase">{opt.id}.</span>
                        {opt.text}
                      </button>
                    )
                  })}
                </div>
              ) : (
                // Short answer / true-false without options: show empty input-like area
                <div className="h-8 rounded-lg border border-dashed border-navy-200 bg-cream-50/50" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
