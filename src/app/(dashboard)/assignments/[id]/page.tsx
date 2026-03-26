'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Bot, Loader2, Send, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { CefrBadge } from '@/components/students/CefrBadge'
import { EXERCISE_TYPE_LABELS, formatDate } from '@/lib/utils'

type AiResult = {
  score: number; feedbackDraft: string
  errors: Array<{ type: string; description: string; example: string }>
  suggestions: string[]
}

type Assignment = {
  id: string; status: string; submittedAt?: string; timeSpentSeconds?: number
  studentAnswers?: Record<string, string>
  autoScore?: number; aiFeedbackDraft?: string
  teacherScore?: number; teacherFeedback?: string
  exercise: { title: string; type: string; cefrLevel: string; content: Record<string, unknown> }
  student: { name: string; currentLevel: string; goal?: string }
  error?: string
}

export default function AssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const queryClient = useQueryClient()
  const [aiResult, setAiResult] = useState<AiResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [score, setScore] = useState<number>(0)
  const [feedback, setFeedback] = useState('')
  const [sent, setSent] = useState(false)

  const { data: assignment, isLoading } = useQuery<Assignment>({
    queryKey: ['assignment', id],
    queryFn: () => fetch(`/api/assignments/${id}`).then(r => r.json()),
  })

  useEffect(() => {
    if (!assignment) return
    if (assignment.autoScore) setScore(assignment.autoScore)
    if (assignment.aiFeedbackDraft) setFeedback(assignment.aiFeedbackDraft)
    if (assignment.teacherFeedback) setFeedback(assignment.teacherFeedback)
    if (assignment.teacherScore) setScore(assignment.teacherScore)
    if (assignment.status === 'RETURNED' || assignment.status === 'GRADED') setSent(true)
  }, [assignment])

  async function analyzeWithAI() {
    setIsAnalyzing(true)
    try {
      const res = await fetch('/api/exercises/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId: id }),
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

  const sendFeedbackMutation = useMutation({
    mutationFn: () => fetch(`/api/assignments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacherScore: score, teacherFeedback: feedback,
        status: 'RETURNED', gradedAt: new Date().toISOString(), returnedAt: new Date().toISOString(),
      }),
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignment', id] })
      queryClient.invalidateQueries({ queryKey: ['assignments'] })
      setSent(true)
      toast.success('Feedback inviato allo studente!')
    },
  })

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
  if (!assignment || assignment.error) return <div className="text-center py-20"><p className="text-muted-foreground">Consegna non trovata.</p></div>

  const studentAnswers = assignment.studentAnswers ?? {}
  const exerciseContent = assignment.exercise.content

  return (
    <div className="space-y-6 max-w-5xl">
      <Link href="/assignments" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-navy-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Correzioni
      </Link>

      <div className="bg-white rounded-2xl p-5 border border-cream-200 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-navy-700">{assignment.exercise.title}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-sm font-medium text-navy-700">{assignment.student.name}</span>
              <CefrBadge level={assignment.exercise.cefrLevel} />
              <Badge variant="outline" className="text-xs">{EXERCISE_TYPE_LABELS[assignment.exercise.type]}</Badge>
              {assignment.submittedAt && <span className="text-xs text-muted-foreground">Consegnato il {formatDate(assignment.submittedAt)}</span>}
              {assignment.timeSpentSeconds && <span className="text-xs text-muted-foreground">{Math.round(assignment.timeSpentSeconds / 60)} minuti</span>}
            </div>
          </div>
          {sent && <Badge className="bg-green-50 text-green-700 border-0">Feedback inviato</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risposte studente */}
        <div className="bg-white rounded-2xl p-5 border border-cream-200 shadow-sm space-y-4">
          <h2 className="font-semibold text-navy-700">Risposte dello studente</h2>
          <Separator />
          {Object.keys(studentAnswers).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessuna risposta registrata</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(studentAnswers).map(([key, value]) => {
                const gaps = (
                  (exerciseContent.gaps || exerciseContent.questions || exerciseContent.sentences ||
                  exerciseContent.items || exerciseContent.statements || exerciseContent.pairs || []) as Array<Record<string, string>>
                )
                const correctItem = gaps.find(g => g.id === key)
                const correctAnswer = correctItem?.answer || correctItem?.correctOptionId || correctItem?.correct || correctItem?.target || ''
                const isCorrect = correctAnswer && String(correctAnswer).toLowerCase() === String(value).toLowerCase()
                return (
                  <div key={key} className="p-3 rounded-xl border border-cream-200 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">{key}</p>
                    <div className="flex items-start gap-2">
                      <p className={`text-sm flex-1 ${correctAnswer ? (isCorrect ? 'text-green-700' : 'text-red-600') : 'text-navy-700'}`}>
                        {isCorrect ? '✓ ' : correctAnswer ? '✗ ' : ''}{String(value)}
                      </p>
                      {correctAnswer && !isCorrect && <p className="text-xs text-green-700 flex-1">✓ {String(correctAnswer)}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pannello correzione AI */}
        <div className="bg-white rounded-2xl p-5 border border-cream-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-navy-700">Correzione AI</h2>
            <Button onClick={analyzeWithAI} disabled={isAnalyzing} size="sm" variant="outline" className="gap-1.5 text-xs">
              {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bot className="w-3 h-3" />}
              {isAnalyzing ? 'Analisi...' : 'Analizza con AI'}
            </Button>
          </div>
          <Separator />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-navy-700">Punteggio (0-100)</label>
            <div className="flex items-center gap-3">
              <input type="range" min={0} max={100} value={score} onChange={e => setScore(Number(e.target.value))} className="flex-1 accent-coral-500" />
              <span className={`text-2xl font-bold w-12 text-center ${score >= 70 ? 'text-green-600' : score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{score}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-navy-700">Feedback per lo studente</label>
            <Textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Scrivi il feedback... oppure premi 'Analizza con AI'" rows={6} className="resize-none text-sm" />
          </div>

          {aiResult?.errors && aiResult.errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-navy-700">Errori rilevati:</p>
              {aiResult.errors.map((e, i) => (
                <div key={i} className="text-xs bg-red-50 rounded-lg p-2.5 space-y-0.5">
                  <p className="font-medium text-red-700">{e.type}</p>
                  <p className="text-red-600">{e.description}</p>
                  {e.example && <p className="text-muted-foreground italic">es. {e.example}</p>}
                </div>
              ))}
            </div>
          )}

          {aiResult?.suggestions && aiResult.suggestions.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-navy-700">Suggerimenti:</p>
              <ul className="text-xs space-y-1">
                {aiResult.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-muted-foreground"><span className="text-coral-500">→</span>{s}</li>
                ))}
              </ul>
            </div>
          )}

          <Button onClick={() => sendFeedbackMutation.mutate()} disabled={!feedback || sendFeedbackMutation.isPending || sent}
            className="w-full bg-coral-500 hover:bg-coral-600 text-white gap-2">
            {sent ? <><CheckCircle className="w-4 h-4" /> Feedback inviato</>
              : sendFeedbackMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Invio...</>
              : <><Send className="w-4 h-4" /> Invia feedback allo studente</>}
          </Button>
        </div>
      </div>
    </div>
  )
}
