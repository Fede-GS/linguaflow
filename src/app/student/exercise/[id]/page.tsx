'use client'

import { use, useState, useRef, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { CheckCircle, Loader2, ChevronLeft, Clock, Send, Award, MessageSquare, X } from 'lucide-react'
import { TTSPlayer } from '@/components/exercises/TTSPlayer'
import { ConversationSimChat } from '@/components/exercises/ConversationSimChat'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CefrBadge } from '@/components/students/CefrBadge'
import { EXERCISE_TYPE_LABELS } from '@/lib/utils'
import { toast } from 'sonner'

type Answers = Record<string, string>

type BlockItemData = {
  id: string
  status: string
  studentAnswers?: Answers
  teacherFeedback?: string
  teacherScore?: number
  teacherNotes?: string
  timeSpentSeconds?: number
  block: { id: string; title: string }
  exercise: {
    title: string; type: string; cefrLevel: string; estimatedMinutes: number
    content: Record<string, unknown>
  }
  error?: string
}

/* ─────────────────────────────────────────────────────────
   FILL-IN-THE-BLANK  — inline blanks + word bank at bottom
───────────────────────────────────────────────────────── */
type Gap = { id: string; hint?: string; baseWord?: string }
type Segment = { type: 'text'; text: string } | { type: 'gap'; gapId: string }

function parseSegments(text: string): Segment[] {
  const parts = text.split(/___([A-Z_0-9]+)___/)
  return parts.map((part, i) =>
    i % 2 === 0 ? { type: 'text', text: part } : { type: 'gap', gapId: part }
  )
}

function FillBlankInteractive({
  text,
  gaps,
  wordBank,
  answers,
  setAnswer,
  readonly = false,
}: {
  text: string
  gaps: Gap[]
  wordBank?: string[]
  answers: Answers
  setAnswer: (k: string, v: string) => void
  readonly?: boolean
}) {
  const [selectedGapId, setSelectedGapId] = useState<string | null>(null)
  const segments = parseSegments(text || '')

  // Which words from the bank are already placed
  const usedWords = new Set(Object.values(answers).filter(Boolean))

  function handleBlankClick(gapId: string) {
    if (readonly) return
    if (answers[gapId]) {
      // Clear it — word returns to bank
      setAnswer(gapId, '')
      setSelectedGapId(gapId)
    } else {
      setSelectedGapId(gapId)
    }
  }

  function handleWordClick(word: string) {
    if (readonly) return
    const targetId = selectedGapId ?? gaps.find(g => !answers[g.id])?.id
    if (!targetId) return
    // If word already used elsewhere, remove it from there first
    const prevGap = gaps.find(g => answers[g.id] === word)
    if (prevGap) setAnswer(prevGap.id, '')
    setAnswer(targetId, word)
    // Move selection to next empty gap
    const remaining = gaps.filter(g => g.id !== targetId && !answers[g.id] && g.id !== (prevGap?.id ?? ''))
    setSelectedGapId(remaining[0]?.id ?? null)
  }

  const hasWordBank = wordBank && wordBank.length > 0

  return (
    <div className="space-y-5">
      {/* Passage with inline blanks */}
      <p className="text-sm text-navy-700 leading-[2.2]">
        {segments.map((seg, i) => {
          if (seg.type === 'text') return <span key={i}>{seg.text}</span>
          const gap = gaps.find(g => g.id === seg.gapId)
          const val = answers[seg.gapId] ?? ''
          const isSelected = selectedGapId === seg.gapId
          const isEmpty = !val
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleBlankClick(seg.gapId)}
              disabled={readonly}
              className={[
                'inline-flex items-center justify-center mx-1 px-2 py-0.5 min-w-[80px]',
                'rounded border-b-2 text-sm font-medium transition-all duration-150',
                'align-baseline leading-none',
                isSelected
                  ? 'border-coral-500 bg-coral-50 text-coral-700 ring-1 ring-coral-200'
                  : isEmpty
                  ? 'border-navy-300/60 bg-cream-50 text-transparent hover:border-coral-400 hover:bg-coral-50/30'
                  : 'border-edu-blue-500 bg-edu-blue-50 text-navy-700 hover:border-coral-400',
                readonly && 'cursor-default pointer-events-none',
              ].join(' ')}
            >
              {val || (gap?.hint ? (
                <span className="text-cream-300 text-xs italic">{gap.hint}</span>
              ) : '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0')}
              {val && !readonly && (
                <X className="w-3 h-3 ml-1 text-muted-foreground/50 flex-shrink-0" />
              )}
            </button>
          )
        })}
      </p>

      {/* Word bank */}
      {hasWordBank && !readonly && (
        <div className="pt-4 border-t border-cream-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Parole disponibili</span>
            <span className="text-[10px] text-muted-foreground/60">— tocca per inserire nel buco selezionato</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {wordBank.map((w) => {
              const isUsed = usedWords.has(w)
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => handleWordClick(w)}
                  disabled={isUsed}
                  className={[
                    'px-3 py-1.5 rounded-xl border text-sm font-medium transition-all duration-150',
                    isUsed
                      ? 'opacity-25 line-through border-cream-200 text-muted-foreground cursor-default'
                      : 'border-cream-200 text-navy-700 bg-white hover:border-coral-400 hover:bg-coral-50 hover:text-coral-700 shadow-sm cursor-pointer',
                  ].join(' ')}
                >
                  {w}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* No word bank: show text inputs below */}
      {!hasWordBank && (
        <div className="space-y-3 pt-3 border-t border-cream-100">
          {gaps.map((g) => (
            <div key={g.id} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-mono w-14 flex-shrink-0 text-right">[{g.id}]</span>
              <input
                type="text"
                readOnly={readonly}
                placeholder={g.hint || g.baseWord || 'Scrivi qui...'}
                value={answers[g.id] || ''}
                onChange={e => setAnswer(g.id, e.target.value)}
                className="flex-1 border border-cream-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-400 bg-white"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


/* ─────────────────────────────────────────────────────────
   COMPREHENSION QUESTIONS  — shared by READING_COMP + LISTENING_COMP
───────────────────────────────────────────────────────── */
function ComprehensionQuestions({ questions, answers, setAnswer, readonly }: {
  questions: Array<{ id: string; question: string; type: string; options?: Array<{ id: string; text: string }> }>
  answers: Answers
  setAnswer: (k: string, v: string) => void
  readonly: boolean
}) {
  return (
    <div className="space-y-5">
      {questions.map((q, i) => (
        <div key={q.id} className="space-y-2">
          <p className="text-sm font-medium text-navy-700">{i + 1}. {q.question}</p>
          {q.type === 'multiple_choice' && q.options ? (
            <div className="space-y-2">
              {q.options.map(opt => (
                <label
                  key={opt.id}
                  className={[
                    'flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors text-sm',
                    answers[q.id] === opt.id ? 'border-coral-400 bg-coral-50' : 'border-cream-200 hover:bg-cream-50',
                    readonly ? 'pointer-events-none' : '',
                  ].join(' ')}
                >
                  <input
                    type="radio" name={q.id} value={opt.id}
                    checked={answers[q.id] === opt.id}
                    onChange={() => setAnswer(q.id, opt.id)}
                    className="accent-coral-500"
                  />
                  {opt.id.toUpperCase()}. {opt.text}
                </label>
              ))}
            </div>
          ) : q.type === 'true_false' ? (
            <div className="flex gap-2">
              {['true', 'false'].map(v => (
                <label
                  key={v}
                  className={[
                    'flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer transition-colors text-sm flex-1 justify-center',
                    answers[q.id] === v ? 'border-coral-400 bg-coral-50 font-medium' : 'border-cream-200 hover:bg-cream-50',
                    readonly ? 'pointer-events-none' : '',
                  ].join(' ')}
                >
                  <input type="radio" name={q.id} value={v} checked={answers[q.id] === v} onChange={() => setAnswer(q.id, v)} className="sr-only" />
                  {v === 'true' ? 'Vero' : 'Falso'}
                </label>
              ))}
            </div>
          ) : (
            <input
              type="text" readOnly={readonly}
              placeholder="Scrivi la risposta..."
              value={answers[q.id] || ''}
              onChange={e => setAnswer(q.id, e.target.value)}
              className="w-full border border-cream-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-400 bg-white"
            />
          )}
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   EXERCISE INTERACTIVE  (all types)
───────────────────────────────────────────────────────── */
function ExerciseInteractive({
  type,
  content,
  answers,
  setAnswer,
  readonly = false,
}: {
  type: string
  content: Record<string, unknown>
  answers: Answers
  setAnswer: (k: string, v: string) => void
  readonly?: boolean
}) {
  switch (type) {
    case 'FILL_BLANK':
    case 'CLOZE': {
      const text = ((content.text || content.passage) as string) ?? ''
      const gaps = (content.gaps || []) as Gap[]
      const wordBank = content.wordBank as string[] | undefined
      return (
        <FillBlankInteractive
          text={text}
          gaps={gaps}
          wordBank={wordBank}
          answers={answers}
          setAnswer={setAnswer}
          readonly={readonly}
        />
      )
    }

    case 'WORD_FORMATION': {
      // schema: items: [{ id, sentence: "frase con ___", baseWord: "ROOT", answer: "formed" }]
      const items = (content.items || []) as Array<{ id: string; sentence: string; baseWord: string }>
      return (
        <div className="space-y-5">
          {items.map((item, i) => {
            const parts = (item.sentence || '').split('___')
            return (
              <div key={item.id} className="space-y-2">
                <div className="flex items-baseline flex-wrap gap-1 text-sm text-navy-700">
                  <span className="text-muted-foreground font-medium flex-shrink-0">{i + 1}.</span>
                  <span>{parts[0]}</span>
                  <input
                    type="text"
                    readOnly={readonly}
                    placeholder={item.baseWord || '...'}
                    value={answers[item.id] || ''}
                    onChange={e => setAnswer(item.id, e.target.value)}
                    className="inline-block w-36 border-b-2 border-navy-300 px-2 py-0.5 text-sm text-center focus:outline-none focus:border-coral-500 bg-transparent"
                  />
                  <span>{parts[1] || ''}</span>
                  <span className="text-xs text-muted-foreground ml-1 flex-shrink-0">({item.baseWord})</span>
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    case 'MULTIPLE_CHOICE': {
      const questions = (content.questions || []) as Array<{
        id: string; text: string; options: Array<{ id: string; text: string }>
      }>
      return (
        <div className="space-y-6">
          {questions.map((q, i) => (
            <div key={q.id} className="space-y-2.5">
              <p className="text-sm font-medium text-navy-700">{i + 1}. {q.text}</p>
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <label
                    key={opt.id}
                    className={[
                      'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors text-sm',
                      answers[q.id] === opt.id
                        ? 'border-coral-400 bg-coral-50 text-coral-800'
                        : 'border-cream-200 hover:bg-cream-50 text-navy-700',
                      readonly ? 'pointer-events-none' : '',
                    ].join(' ')}
                  >
                    <input
                      type="radio" name={q.id} value={opt.id}
                      checked={answers[q.id] === opt.id}
                      onChange={() => setAnswer(q.id, opt.id)}
                      className="accent-coral-500 flex-shrink-0"
                      readOnly={readonly}
                    />
                    <span>{opt.id.toUpperCase()}. {opt.text}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )
    }

    case 'TRUE_FALSE': {
      const statements = (content.statements || []) as Array<{ id: string; statement: string }>
      return (
        <div className="space-y-4">
          {!!content.text && (
            <p className="text-sm text-muted-foreground italic bg-cream-50 p-3 rounded-xl">{String(content.text)}</p>
          )}
          {statements.map((s, i) => (
            <div key={s.id} className="space-y-2">
              <p className="text-sm font-medium text-navy-700">{i + 1}. {s.statement}</p>
              <div className="flex gap-2">
                {['true', 'false', 'not_given'].map(v => (
                  <label
                    key={v}
                    className={[
                      'flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-colors text-sm flex-1 justify-center',
                      answers[s.id] === v
                        ? 'border-coral-400 bg-coral-50 text-coral-700 font-medium'
                        : 'border-cream-200 hover:bg-cream-50 text-navy-700',
                      readonly ? 'pointer-events-none' : '',
                    ].join(' ')}
                  >
                    <input
                      type="radio" name={s.id} value={v}
                      checked={answers[s.id] === v}
                      onChange={() => setAnswer(s.id, v)}
                      className="accent-coral-500 sr-only"
                    />
                    {v === 'true' ? 'Vero' : v === 'false' ? 'Falso' : 'Non dato'}
                  </label>
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
        <div className="space-y-3">
          {pairs.map((p) => (
            <div key={p.id} className="grid grid-cols-2 gap-3 items-center">
              <div className="text-sm bg-cream-50 p-2.5 rounded-xl border border-cream-200">{p.left}</div>
              <select
                value={answers[p.id] || ''}
                onChange={e => setAnswer(p.id, e.target.value)}
                disabled={readonly}
                className="border border-cream-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-400 bg-white"
              >
                <option value="">Scegli...</option>
                {pairs.map(opt => (
                  <option key={opt.id} value={opt.right}>{opt.right}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )
    }

    case 'SHORT_ANSWER':
    case 'ESSAY': {
      return (
        <div className="space-y-5">
          {!!content.prompt && (
            <div className="bg-cream-50 p-4 rounded-xl border border-cream-200">
              <p className="text-sm font-medium text-navy-700 mb-1">Traccia:</p>
              <p className="text-sm text-navy-700">{String(content.prompt)}</p>
              {!!(content.minWords || content.maxWords) && (
                <p className="text-xs text-muted-foreground mt-2">
                  {Number(content.minWords ?? 0)}–{Number(content.maxWords ?? 0)} parole
                </p>
              )}
            </div>
          )}
          {(content.questions as Array<{ id: string; question: string; maxWords?: number }> | undefined)?.map((q, i) => (
            <div key={q.id} className="space-y-2">
              <p className="text-sm font-medium text-navy-700">{i + 1}. {q.question}</p>
              <Textarea
                readOnly={readonly}
                placeholder="Scrivi la tua risposta..."
                value={answers[q.id] || ''}
                onChange={e => setAnswer(q.id, e.target.value)}
                rows={q.maxWords && q.maxWords > 50 ? 6 : 3}
                className="resize-none text-sm"
              />
            </div>
          ))}
          {!!content.prompt && (
            <div className="space-y-2">
              <Textarea
                readOnly={readonly}
                placeholder="Scrivi il tuo testo qui..."
                value={answers['essay'] || ''}
                onChange={e => setAnswer('essay', e.target.value)}
                rows={10}
                className="resize-none text-sm"
              />
              {!!content.maxWords && (
                <p className="text-xs text-muted-foreground text-right">
                  {(answers['essay'] || '').trim().split(/\s+/).filter(Boolean).length}/{Number(content.maxWords)} parole
                </p>
              )}
            </div>
          )}
        </div>
      )
    }

    case 'READING_COMP': {
      const passage = content.passage as string
      const questions = (content.questions || []) as Array<{
        id: string; question: string; type: string; options?: Array<{ id: string; text: string }>
      }>
      return (
        <div className="space-y-5">
          <div className="bg-cream-50 rounded-xl p-4 text-sm text-navy-700 leading-relaxed max-h-56 overflow-y-auto border border-cream-200">
            {passage}
          </div>
          <ComprehensionQuestions questions={questions} answers={answers} setAnswer={setAnswer} readonly={readonly} />
        </div>
      )
    }

    case 'LISTENING_COMP': {
      const transcript = (content.transcript || content.passage) as string
      const questions = (content.questions || []) as Array<{
        id: string; question: string; type: string; options?: Array<{ id: string; text: string }>
      }>
      return (
        <div className="space-y-5">
          <TTSPlayer text={transcript} />
          <ComprehensionQuestions questions={questions} answers={answers} setAnswer={setAnswer} readonly={readonly} />
        </div>
      )
    }

    case 'DICTATION': {
      // schema: { text: "testo da dettare", hint?, focusPoints? }
      const text = content.text as string
      const hint = content.hint as string | undefined
      const focusPoints = content.focusPoints as string[] | undefined
      return (
        <div className="space-y-5">
          {!!hint && (
            <p className="text-xs text-muted-foreground italic bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl">
              💡 Suggerimento: {hint}
            </p>
          )}
          {focusPoints && focusPoints.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground">Focus:</span>
              {focusPoints.map((fp, i) => (
                <span key={i} className="text-xs bg-edu-blue-50 text-edu-blue-700 px-2 py-0.5 rounded-full border border-edu-blue-100">{fp}</span>
              ))}
            </div>
          )}
          <TTSPlayer text={text} />
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Scrivi il testo che senti:</p>
            <Textarea
              readOnly={readonly}
              placeholder="Scrivi qui il testo dettato..."
              value={answers['dictation'] || ''}
              onChange={e => setAnswer('dictation', e.target.value)}
              rows={5}
              className="resize-none text-sm"
            />
          </div>
        </div>
      )
    }

    case 'CONVERSATION_SIM': {
      const saved = answers['conversation']
      const initialMessages = saved ? (() => { try { return JSON.parse(saved) } catch { return undefined } })() : undefined
      return (
        <ConversationSimChat
          content={content}
          readonly={readonly}
          initialMessages={initialMessages}
          onUpdate={msgs => setAnswer('conversation', JSON.stringify(msgs))}
        />
      )
    }

    case 'TRANSLATION': {
      const items = (content.items || []) as Array<{ id: string; source: string }>
      return (
        <div className="space-y-4">
          {items.map((item, i) => (
            <div key={item.id} className="space-y-2">
              <p className="text-sm font-medium text-navy-700">
                {i + 1}. <span className="bg-cream-100 px-1.5 py-0.5 rounded-md">{item.source}</span>
              </p>
              <input
                type="text" readOnly={readonly}
                placeholder="Traduzione..."
                value={answers[item.id] || ''}
                onChange={e => setAnswer(item.id, e.target.value)}
                className="w-full border border-cream-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-400 bg-white"
              />
            </div>
          ))}
        </div>
      )
    }

    case 'ERROR_CORRECTION': {
      const sentences = (content.sentences || []) as Array<{ id: string; incorrect: string }>
      return (
        <div className="space-y-4">
          {sentences.map((s, i) => (
            <div key={s.id} className="space-y-2">
              <p className="text-sm text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-100">
                {i + 1}. <span className="italic">{s.incorrect}</span>
              </p>
              <input
                type="text" readOnly={readonly}
                placeholder="Scrivi la frase corretta..."
                value={answers[s.id] || ''}
                onChange={e => setAnswer(s.id, e.target.value)}
                className="w-full border border-cream-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-400 bg-white"
              />
            </div>
          ))}
        </div>
      )
    }

    case 'REORDER': {
      // schema: sentences: [{ id, words: ["scrambled", "array"], correctOrder: [...], hint? }]
      const sentences = (content.sentences || content.items || []) as Array<{
        id: string; words?: string[]; text?: string; hint?: string
      }>
      return (
        <div className="space-y-6">
          <p className="text-xs text-muted-foreground italic">Riordina le parole per formare una frase corretta.</p>
          {sentences.map((s, i) => {
            const words = s.words ?? (s.text ? s.text.split(' ') : [])
            const currentAnswer = answers[s.id] || ''
            const usedIndices: number[] = currentAnswer ? currentAnswer.split(',').map(Number).filter(n => !isNaN(n)) : []

            return (
              <div key={s.id} className="space-y-3">
                <p className="text-sm font-medium text-navy-700">{i + 1}. {s.hint || 'Riordina le parole:'}</p>

                {/* Answer area */}
                <div
                  className="min-h-10 p-2.5 rounded-xl border-2 border-dashed border-cream-300 bg-cream-50 flex flex-wrap gap-2"
                >
                  {usedIndices.length === 0
                    ? <span className="text-xs text-muted-foreground italic self-center px-1">Tocca le parole qui sotto per costruire la frase...</span>
                    : usedIndices.map((wi, pos) => (
                      <button
                        key={pos} type="button" disabled={readonly}
                        onClick={() => {
                          const newUsed = usedIndices.filter((_, p) => p !== pos)
                          setAnswer(s.id, newUsed.join(','))
                        }}
                        className="px-2.5 py-1 rounded-lg bg-coral-500 text-white text-sm font-medium hover:bg-coral-600 transition-colors"
                      >
                        {words[wi]}
                      </button>
                    ))
                  }
                </div>

                {/* Word bank */}
                <div className="flex flex-wrap gap-2">
                  {words.map((w, wi) => {
                    const isUsed = usedIndices.includes(wi)
                    return (
                      <button
                        key={wi} type="button" disabled={isUsed || readonly}
                        onClick={() => {
                          if (isUsed) return
                          const newUsed = [...usedIndices, wi]
                          setAnswer(s.id, newUsed.join(','))
                        }}
                        className={[
                          'px-2.5 py-1.5 rounded-xl border text-sm font-medium transition-all',
                          isUsed
                            ? 'opacity-25 border-cream-200 text-muted-foreground cursor-default line-through'
                            : 'border-navy-200 text-navy-700 bg-white hover:bg-cream-50 hover:border-coral-400 cursor-pointer',
                        ].join(' ')}
                      >
                        {w}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )
    }

    case 'DIALOGUE_COMPLETE': {
      // schema uses isGap (not isBlank) — check both for compatibility
      const lines = (content.dialogue || content.lines || []) as Array<{
        id: string; speaker: string; text: string; isBlank?: boolean; isGap?: boolean; options?: string[]
      }>
      const scenario = content.scenario as string | undefined
      return (
        <div className="space-y-4">
          {!!scenario && (
            <p className="text-xs text-muted-foreground italic bg-cream-50 p-3 rounded-xl border border-cream-200">
              📍 {scenario}
            </p>
          )}
          <div className="space-y-3">
            {lines.map((line) => {
              const isBlank = line.isBlank || line.isGap
              const isB = line.speaker === 'B'
              return (
                <div key={line.id} className={`flex gap-3 ${isB ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isB ? 'bg-coral-500 text-white' : 'bg-edu-blue-500 text-white'}`}>
                    {line.speaker}
                  </div>
                  <div className="flex-1 max-w-[80%]">
                    {isBlank ? (
                      line.options && line.options.length > 0 ? (
                        <select
                          value={answers[line.id] || ''}
                          onChange={e => setAnswer(line.id, e.target.value)}
                          disabled={readonly}
                          className="w-full border border-cream-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-400 bg-white"
                        >
                          <option value="">Scegli una risposta...</option>
                          {line.options.map((opt, oi) => (
                            <option key={oi} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text" readOnly={readonly}
                          placeholder="Completa la battuta..."
                          value={answers[line.id] || ''}
                          onChange={e => setAnswer(line.id, e.target.value)}
                          className="w-full border border-cream-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-coral-500/20 focus:border-coral-400 bg-white"
                        />
                      )
                    ) : (
                      <div className={`px-3 py-2 rounded-xl text-sm ${isB ? 'bg-coral-50 border border-coral-100' : 'bg-cream-50 border border-cream-200'}`}>
                        {line.text}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    default: {
      return (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Scrivi la tua risposta:</p>
          <Textarea
            readOnly={readonly}
            placeholder="Risposta..."
            value={answers['answer'] || ''}
            onChange={e => setAnswer('answer', e.target.value)}
            rows={6}
            className="resize-none text-sm"
          />
        </div>
      )
    }
  }
}

/* ─────────────────────────────────────────────────────────
   MAIN EXERCISE CONTENT
───────────────────────────────────────────────────────── */
function ExerciseContent({ itemId }: { itemId: string }) {
  const params = useSearchParams()
  const router = useRouter()
  const blockId = params.get('blockId') ?? ''
  const startTimeRef = useRef(Date.now())

  const [answers, setAnswers] = useState<Answers>({})
  const [submitted, setSubmitted] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000)), 10000)
    return () => clearInterval(t)
  }, [])

  const { data: item, isLoading } = useQuery<BlockItemData>({
    queryKey: ['block-item', itemId],
    queryFn: () => fetch(`/api/student-blocks/item/${itemId}`).then(r => r.json()),
  })

  useEffect(() => {
    if (!item) return
    if (['SUBMITTED', 'RETURNED', 'GRADED'].includes(item.status)) setSubmitted(true)
    if (item.studentAnswers) setAnswers(item.studentAnswers)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.status])

  const saveMutation = useMutation({
    mutationFn: (data: { status: string; studentAnswers: Answers; timeSpentSeconds: number }) =>
      fetch('/api/student-blocks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, blockId, ...data }),
      }).then(r => r.json()),
  })

  // Auto-save after 5s of inactivity
  useEffect(() => {
    if (!item || submitted || Object.keys(answers).length === 0) return
    const timer = setTimeout(() => {
      saveMutation.mutate({
        status: 'IN_PROGRESS',
        studentAnswers: answers,
        timeSpentSeconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
      })
    }, 5000)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers])

  function submitExercise() {
    if (!confirm('Sei sicuro di voler consegnare questo esercizio?')) return
    saveMutation.mutate(
      {
        status: 'SUBMITTED',
        studentAnswers: answers,
        timeSpentSeconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
      },
      {
        onSuccess: () => { setSubmitted(true); toast.success('Esercizio consegnato!') },
        onError: () => toast.error('Errore nel salvataggio'),
      },
    )
  }

  const setAnswer = (key: string, val: string) => setAnswers(prev => ({ ...prev, [key]: val }))

  if (isLoading) return (
    <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
  )
  if (!item || item.error) return (
    <p className="text-center text-muted-foreground py-10">Esercizio non trovato.</p>
  )

  const content = item.exercise.content
  const hasScore = item.teacherScore !== null && item.teacherScore !== undefined
  const hasFeedback = !!item.teacherFeedback

  // ── Feedback received view ───────────────────────────
  if (submitted && (hasScore || hasFeedback)) {
    return (
      <div className="space-y-5">
        <button
          onClick={() => router.push('/student')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-navy-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> I miei esercizi
        </button>

        <div className="bg-white rounded-2xl p-6 border border-cream-200 shadow-sm space-y-5">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-coral-50 flex items-center justify-center mx-auto mb-3">
              <Award className="w-7 h-7 text-coral-500" />
            </div>
            <h2 className="font-display text-xl font-bold text-navy-700">Feedback ricevuto!</h2>
            {hasScore && (
              <div className={`text-6xl font-bold mt-4 tabular-nums ${Number(item.teacherScore) >= 70 ? 'text-emerald-600' : 'text-amber-500'}`}>
                {item.teacherScore}<span className="text-2xl text-muted-foreground">/100</span>
              </div>
            )}
          </div>
          {hasFeedback && (
            <div className="bg-cream-50 rounded-xl p-4 border border-cream-200">
              <p className="text-sm font-medium text-navy-700 mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-coral-500" /> Commento dell&apos;insegnante:
              </p>
              <p className="text-sm text-navy-700 whitespace-pre-wrap leading-relaxed">{item.teacherFeedback}</p>
            </div>
          )}

          {/* Riepilogo risposte */}
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-navy-700 list-none flex items-center gap-1">
              <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
              Rivedi le tue risposte
            </summary>
            <div className="mt-3 rounded-xl border border-cream-200 overflow-hidden">
              <ExerciseInteractive
                type={item.exercise.type}
                content={content}
                answers={answers}
                setAnswer={() => {}}
                readonly
              />
            </div>
          </details>

          <Button onClick={() => router.push('/student')} className="w-full bg-coral-500 hover:bg-coral-600 text-white">
            Torna agli esercizi
          </Button>
        </div>
      </div>
    )
  }

  // ── Submitted / waiting view ─────────────────────────
  if (submitted) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="font-display text-xl font-bold text-navy-700">Esercizio consegnato!</h2>
        <p className="text-muted-foreground text-sm">Il tuo insegnante lo correggerà presto.</p>
        <Button onClick={() => router.push('/student')} variant="outline" className="mt-2">
          Torna ai miei esercizi
        </Button>
      </div>
    )
  }

  // ── Active exercise view ─────────────────────────────
  return (
    <div className="space-y-5">
      <button
        onClick={() => router.push('/student')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-navy-700 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> {item.block.title}
      </button>

      <div className="bg-white rounded-2xl p-5 border border-cream-200 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-navy-700">{item.exercise.title}</h1>
            <div className="flex gap-2 mt-1.5 flex-wrap">
              <CefrBadge level={item.exercise.cefrLevel} />
              <Badge variant="outline" className="text-xs">{EXERCISE_TYPE_LABELS[item.exercise.type]}</Badge>
              <Badge variant="outline" className="text-xs">{item.exercise.estimatedMinutes} min</Badge>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-shrink-0 bg-cream-50 px-3 py-1.5 rounded-xl border border-cream-200">
            <Clock className="w-3.5 h-3.5" />
            <span className="tabular-nums font-mono text-xs">
              {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
            </span>
          </div>
        </div>
        {item.teacherNotes && (
          <div className="mt-3 bg-edu-blue-50 border border-edu-blue-100 rounded-xl px-3 py-2.5">
            <p className="text-xs font-medium text-edu-blue-700 mb-0.5">📝 Note dell&apos;insegnante:</p>
            <p className="text-sm text-edu-blue-800">{item.teacherNotes}</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl p-5 border border-cream-200 shadow-sm space-y-5">
        {!!content.instructions && (
          <p className="text-sm text-muted-foreground italic bg-cream-50 p-3 rounded-xl border border-cream-100">
            {String(content.instructions)}
          </p>
        )}
        <ExerciseInteractive type={item.exercise.type} content={content} answers={answers} setAnswer={setAnswer} />
      </div>

      <Button
        onClick={submitExercise}
        disabled={saveMutation.isPending || Object.keys(answers).length === 0}
        className="w-full bg-coral-500 hover:bg-coral-600 text-white font-medium gap-2 h-12 rounded-2xl shadow-sm"
      >
        {saveMutation.isPending
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvataggio...</>
          : <><Send className="w-4 h-4" /> Consegna esercizio</>}
      </Button>

      {Object.keys(answers).length > 0 && (
        <p className="text-xs text-center text-muted-foreground">
          💾 Il progresso viene salvato automaticamente
        </p>
      )}
    </div>
  )
}

export default function StudentExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <Suspense fallback={
      <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
    }>
      <ExerciseContent itemId={id} />
    </Suspense>
  )
}
