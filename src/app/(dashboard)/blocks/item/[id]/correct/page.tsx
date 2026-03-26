'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Bot, Loader2, Send, CheckCircle, User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { CefrBadge } from '@/components/students/CefrBadge'
import { AvatarInitials } from '@/components/ui/lf-components'
import { EXERCISE_TYPE_LABELS, formatDate, cn } from '@/lib/utils'

type AiResult = {
  score: number; feedbackDraft: string
  errors: Array<{ type: string; description: string; example: string }>
  suggestions: string[]
}

type BlockItem = {
  id: string; status: string; submittedAt?: string; gradedAt?: string
  timeSpentSeconds?: number; order: number
  studentAnswers?: Record<string, string>
  teacherScore?: number; teacherFeedback?: string
  exercise: {
    id: string; title: string; type: string; cefrLevel: string
    content: Record<string, unknown>; topic?: string
  }
  block: {
    id: string; title: string
    student: { id: string; name: string; currentLevel: string; targetLevel: string }
  }
  error?: string
}

export default function BlockItemCorrectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const queryClient = useQueryClient()
  const [aiResult, setAiResult] = useState<AiResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [score, setScore] = useState<number>(0)
  const [feedback, setFeedback] = useState('')
  const [sent, setSent] = useState(false)

  const { data: item, isLoading } = useQuery<BlockItem>({
    queryKey: ['block-item', id],
    queryFn: () => fetch(`/api/blocks/item/${id}`).then(r => r.json()),
  })

  useEffect(() => {
    if (!item) return
    if (item.teacherScore != null) setScore(item.teacherScore)
    if (item.teacherFeedback) setFeedback(item.teacherFeedback)
    if (item.status === 'RETURNED' || item.status === 'GRADED') setSent(true)
  }, [item])

  async function analyzeWithAI() {
    if (!item) return
    setIsAnalyzing(true)
    try {
      const res = await fetch('/api/exercises/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exerciseId: item.exercise.id,
          studentAnswers: item.studentAnswers,
        }),
      })
      const result: AiResult = await res.json()
      setAiResult(result)
      setScore(result.score)
      setFeedback(result.feedbackDraft)
      toast.success('Analisi AI completata!')
    } catch {
      toast.error("Errore nell'analisi AI")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const sendMutation = useMutation({
    mutationFn: () => fetch(`/api/blocks/item/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherScore: score, teacherFeedback: feedback, status: 'RETURNED' }),
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['block-item', id] })
      queryClient.invalidateQueries({ queryKey: ['blocks'] })
      setSent(true)
      toast.success('Feedback inviato allo studente!')
    },
  })

  if (isLoading) return (
    <div className="space-y-4 max-w-5xl">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
  if (!item || item.error) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">Esercizio non trovato.</p>
    </div>
  )

  const studentAnswers = item.studentAnswers ?? {}
  const content = item.exercise.content
  const gaps = (
    (content.gaps || content.questions || content.sentences ||
    content.items || content.statements || content.pairs || []) as Array<Record<string, string>>
  )

  function getCorrect(key: string): string {
    const g = gaps.find(g => g.id === key)
    return g ? (g.answer || g.correctOptionId || g.correct || g.target || '') : ''
  }

  const scoreColor = score >= 70 ? 'text-green-600' : score >= 50 ? 'text-amber-500' : 'text-red-500'

  return (
    <div className="space-y-6 max-w-5xl">
      <Link
        href="/assignments"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-navy-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Esercizi assegnati
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-2xl p-5 border border-cream-200 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-4">
          <AvatarInitials name={item.block.student.name} size="lg" color="blue" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="font-display text-xl font-bold text-navy-700">{item.exercise.title}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Blocco: <span className="text-navy-700 font-medium">{item.block.title}</span>
                  {item.exercise.topic && (
                    <span className="ml-2 text-xs bg-edu-blue-500/10 text-edu-blue-600 px-2 py-0.5 rounded-full">
                      {item.exercise.topic}
                    </span>
                  )}
                </p>
              </div>
              {sent && (
                <span className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full font-medium flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Feedback inviato
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
              <div className="flex items-center gap-1.5 text-sm text-navy-700">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-medium">{item.block.student.name}</span>
              </div>
              <CefrBadge level={item.exercise.cefrLevel} />
              <span className="text-xs bg-cream-100 text-navy-700 px-2 py-0.5 rounded-md">
                {EXERCISE_TYPE_LABELS[item.exercise.type] ?? item.exercise.type}
              </span>
              {item.submittedAt && (
                <span className="text-xs text-muted-foreground">
                  Consegnato il {formatDate(item.submittedAt)}
                </span>
              )}
              {item.timeSpentSeconds != null && (
                <span className="text-xs text-muted-foreground">
                  {Math.round(item.timeSpentSeconds / 60)} min
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Student answers */}
        <div className="bg-white rounded-2xl p-5 border border-cream-200 shadow-[var(--shadow-card)] space-y-4">
          <h2 className="font-semibold text-navy-700">Risposte dello studente</h2>
          <Separator />
          {Object.keys(studentAnswers).length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Nessuna risposta registrata</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(studentAnswers).map(([key, value]) => {
                const correct = getCorrect(key)
                const isCorrect = correct && String(correct).toLowerCase() === String(value).toLowerCase()
                return (
                  <div key={key} className={cn(
                    'p-3 rounded-xl border space-y-1',
                    isCorrect ? 'border-green-100 bg-green-50/40' :
                    correct ? 'border-red-100 bg-red-50/30' : 'border-cream-200',
                  )}>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{key}</p>
                    <div className="flex items-start gap-3">
                      <p className={cn('text-sm flex-1', isCorrect ? 'text-green-700' : correct ? 'text-red-600' : 'text-navy-700')}>
                        {isCorrect ? '✓ ' : correct ? '✗ ' : ''}{String(value)}
                      </p>
                      {correct && !isCorrect && (
                        <p className="text-xs text-green-700 flex-1">✓ {String(correct)}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Correction panel */}
        <div className="bg-white rounded-2xl p-5 border border-cream-200 shadow-[var(--shadow-card)] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-navy-700">Correzione</h2>
            <Button
              onClick={analyzeWithAI}
              disabled={isAnalyzing}
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-7"
            >
              {isAnalyzing
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Analisi...</>
                : <><Bot className="w-3 h-3" /> Analizza con AI</>}
            </Button>
          </div>
          <Separator />

          {/* Score slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-navy-700">Punteggio</label>
              <span className={cn('text-3xl font-bold tabular-nums', scoreColor)}>{score}</span>
            </div>
            <input
              type="range" min={0} max={100} value={score}
              onChange={e => setScore(Number(e.target.value))}
              className="w-full accent-coral-500"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span><span>50</span><span>100</span>
            </div>
          </div>

          {/* Feedback textarea */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-navy-700">Feedback per lo studente</label>
            <Textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Scrivi il feedback... oppure premi 'Analizza con AI'"
              rows={5}
              className="resize-none text-sm"
            />
          </div>

          {/* AI errors */}
          {aiResult?.errors && aiResult.errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-navy-700">Errori rilevati:</p>
              {aiResult.errors.map((e, i) => (
                <div key={i} className="text-xs bg-red-50 rounded-xl p-3 space-y-0.5">
                  <p className="font-medium text-red-700">{e.type}</p>
                  <p className="text-red-600">{e.description}</p>
                  {e.example && <p className="text-muted-foreground italic">es. {e.example}</p>}
                </div>
              ))}
            </div>
          )}

          {/* AI suggestions */}
          {aiResult?.suggestions && aiResult.suggestions.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-navy-700">Suggerimenti:</p>
              <ul className="text-xs space-y-1">
                {aiResult.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-muted-foreground">
                    <span className="text-coral-500 mt-0.5">→</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button
            onClick={() => sendMutation.mutate()}
            disabled={!feedback || sendMutation.isPending || sent}
            className="w-full bg-coral-500 hover:bg-coral-600 text-white gap-2"
          >
            {sent
              ? <><CheckCircle className="w-4 h-4" /> Feedback inviato</>
              : sendMutation.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Invio...</>
              : <><Send className="w-4 h-4" /> Invia feedback allo studente</>}
          </Button>
        </div>
      </div>
    </div>
  )
}
