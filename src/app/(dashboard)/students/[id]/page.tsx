'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, Edit2, Target, BookOpen, StickyNote, Trash2,
  Clock, CheckCircle, Layers, Calendar, Plus, Copy, Pencil,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { CefrBadge } from '@/components/students/CefrBadge'
import { SkillRadar } from '@/components/students/SkillRadar'
import { StudentForm, type StudentFormData } from '@/components/students/StudentForm'
import { getInitials, ASSIGNMENT_STATUS_LABELS, EXERCISE_TYPE_LABELS, formatDate, cn } from '@/lib/utils'

type BlockItem = {
  id: string; order: number; topicLabel?: string; status: string
  exercise: { id: string; title: string; type: string; cefrLevel: string; skillFocus: string; estimatedMinutes: number }
}

type Block = {
  id: string; title: string; topics: string[]; comments?: string; dueDate?: string
  status: string; createdAt: string
  items: BlockItem[]
}

type Student = {
  id: string; name: string; email?: string; phone?: string; targetLanguage: string
  currentLevel: string; targetLevel: string; goal?: string; notes?: string; isActive: boolean
  readingScore: number; writingScore: number; listeningScore: number
  speakingScore: number; grammarScore: number; vocabularyScore: number
  currentReadingScore: number; currentWritingScore: number; currentListeningScore: number
  currentSpeakingScore: number; currentGrammarScore: number; currentVocabularyScore: number
  accessCode?: string
  learningStyle?: string; studyHoursPerWeek?: number; previousExperience?: string
  assignments: Array<{
    id: string; status: string; assignedAt: string; submittedAt?: string
    teacherScore?: number
    exercise: { title: string; type: string; cefrLevel: string }
  }>
  blocks: Block[]
  error?: string
}

const BLOCK_STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  ASSIGNED: { label: 'Assegnato', cls: 'bg-blue-50 text-blue-700' },
  IN_PROGRESS: { label: 'In corso', cls: 'bg-amber-50 text-amber-700' },
  COMPLETED: { label: 'Completato', cls: 'bg-green-50 text-green-700' },
  GRADED: { label: 'Corretto', cls: 'bg-purple-50 text-purple-700' },
  RETURNED: { label: 'Restituito', cls: 'bg-green-50 text-green-700' },
}

const LEARNING_STYLE_LABELS: Record<string, string> = {
  visual: '👁️ Visivo', auditory: '👂 Uditivo', kinesthetic: '🤲 Cinestetico',
  reading: '📝 Lettura/Scrittura', mixed: '🔀 Misto',
}

function BlockCard({ block }: { block: Block }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = BLOCK_STATUS_CONFIG[block.status] ?? { label: block.status, cls: 'bg-gray-50 text-gray-600' }
  const totalMinutes = block.items.reduce((acc, i) => acc + (i.exercise.estimatedMinutes ?? 0), 0)

  return (
    <div className="bg-white rounded-xl border border-cream-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-navy-700 text-sm">{block.title}</p>
              <Badge variant="outline" className={cn('text-xs border-0', cfg.cls)}>{cfg.label}</Badge>
            </div>
            {block.topics.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {block.topics.map(t => (
                  <span key={t} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>{block.items.length} esercizi · {totalMinutes} min</span>
              {block.dueDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Scadenza: {formatDate(block.dueDate)}
                </span>
              )}
            </div>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-muted-foreground hover:text-navy-700 flex-shrink-0">
            {expanded ? 'Chiudi' : 'Dettagli'}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-cream-100 divide-y divide-cream-100">
          {block.items.map((item, idx) => (
            <div key={item.id} className="px-4 py-2.5 flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-cream-200 text-navy-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-navy-700 font-medium truncate">{item.exercise.title}</p>
                <p className="text-xs text-muted-foreground">{EXERCISE_TYPE_LABELS[item.exercise.type]} · {item.exercise.estimatedMinutes} min</p>
                {item.topicLabel && <p className="text-xs text-blue-600 mt-0.5">→ {item.topicLabel}</p>}
              </div>
              <Badge variant="outline" className={cn('text-xs border-0 flex-shrink-0',
                item.status === 'RETURNED' ? 'bg-green-50 text-green-700' :
                item.status === 'SUBMITTED' ? 'bg-amber-50 text-amber-700' :
                item.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700' :
                'bg-gray-50 text-gray-600'
              )}>{ASSIGNMENT_STATUS_LABELS[item.status]}</Badge>
              {(item.status === 'SUBMITTED' || item.status === 'RETURNED' || item.status === 'GRADED') && (
                <Link href={`/blocks/item/${item.id}/correct`}>
                  <button className="p-1 rounded-lg hover:bg-cream-100 text-muted-foreground hover:text-coral-500 transition-colors" title="Correggi">
                    <Pencil className="w-3 h-3" />
                  </button>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(false)
  const [topicFilter, setTopicFilter] = useState<string | null>(null)

  const { data: student, isLoading } = useQuery<Student>({
    queryKey: ['student', id],
    queryFn: () => fetch(`/api/students/${id}`).then(r => r.json()),
  })

  useEffect(() => {
    if (student?.notes) setNotes(student.notes)
  }, [student?.notes])

  const updateMutation = useMutation({
    mutationFn: (data: Partial<StudentFormData>) =>
      fetch(`/api/students/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', id] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
      setEditOpen(false)
      toast.success('Profilo aggiornato')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => fetch(`/api/students/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => { router.push('/students'); toast.success('Studente rimosso') },
  })

  async function saveNotes() {
    await fetch(`/api/students/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }) })
    setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
    queryClient.invalidateQueries({ queryKey: ['student', id] })
  }

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
  if (!student || student.error) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">Studente non trovato.</p>
      <Link href="/students"><Button className="mt-4" variant="outline">Torna agli studenti</Button></Link>
    </div>
  )

  const skillScores = {
    readingScore: student.readingScore ?? 0,
    writingScore: student.writingScore ?? 0,
    listeningScore: student.listeningScore ?? 0,
    speakingScore: student.speakingScore ?? 0,
    grammarScore: student.grammarScore ?? 0,
    vocabularyScore: student.vocabularyScore ?? 0,
  }

  const currentSkillScores = {
    readingScore: student.currentReadingScore ?? 0,
    writingScore: student.currentWritingScore ?? 0,
    listeningScore: student.currentListeningScore ?? 0,
    speakingScore: student.currentSpeakingScore ?? 0,
    grammarScore: student.currentGrammarScore ?? 0,
    vocabularyScore: student.currentVocabularyScore ?? 0,
  }

  const hasCurrentScores = Object.values(currentSkillScores).some(v => v > 0)

  const blocks = student.blocks ?? []
  // Collect all unique topics across all blocks
  const allTopics = Array.from(new Set(blocks.flatMap(b => b.topics ?? []))).filter(Boolean)
  const filteredBlocks = topicFilter ? blocks.filter(b => b.topics?.includes(topicFilter)) : blocks
  const pendingBlocks = filteredBlocks.filter(b => ['ASSIGNED', 'IN_PROGRESS'].includes(b.status))
  const doneBlocks = filteredBlocks.filter(b => ['COMPLETED', 'GRADED', 'RETURNED'].includes(b.status))

  return (
    <div className="space-y-6">
      <Link href="/students" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-navy-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Tutti gli studenti
      </Link>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-edu-blue-500 flex items-center justify-center text-white text-xl font-bold">
              {getInitials(student.name)}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-navy-700">{student.name}</h1>
              <p className="text-muted-foreground text-sm">{student.targetLanguage === 'english' ? '🇬🇧 Inglese' : '🇮🇹 Italiano'}</p>
              <div className="flex items-center gap-2 mt-2">
                <CefrBadge level={student.currentLevel} showLabel />
                <span className="text-muted-foreground">→</span>
                <CefrBadge level={student.targetLevel} showLabel />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/blocks/new">
              <Button size="sm" className="bg-coral-500 hover:bg-coral-600 text-white gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Nuovo blocco
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5">
              <Edit2 className="w-3.5 h-3.5" /> Modifica
            </Button>
            <Button variant="outline" size="sm" onClick={() => { if (confirm('Rimuovere questo studente?')) deleteMutation.mutate() }} className="text-destructive hover:text-destructive gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="bg-white border border-cream-200">
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="blocks">
            Blocchi
            {blocks.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{blocks.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="notes">Note</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-cream-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Profilo competenze</CardTitle>
              </CardHeader>
              <CardContent>
                <SkillRadar scores={skillScores} currentScores={hasCurrentScores ? currentSkillScores : undefined} size={220} />
              </CardContent>
            </Card>
            <div className="space-y-3">
              <Card className="border-cream-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Target className="w-4 h-4" /> Obiettivo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-navy-700 text-sm">{student.goal || 'Nessun obiettivo definito'}</p>
                </CardContent>
              </Card>
              <Card className="border-cream-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <BookOpen className="w-4 h-4" /> Progressione
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-navy-700">{student.currentLevel}</div>
                      <div className="text-xs text-muted-foreground">Ora</div>
                    </div>
                    <div className="flex-1 h-2 bg-cream-200 rounded-full overflow-hidden">
                      <div className="h-full bg-coral-500 rounded-full" style={{ width: `${(['A1','A2','B1','B2','C1','C2'].indexOf(student.currentLevel) / 5) * 100}%` }} />
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-coral-500">{student.targetLevel}</div>
                      <div className="text-xs text-muted-foreground">Obiettivo</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {(student.learningStyle || student.studyHoursPerWeek != null || student.email || student.phone) && (
                <Card className="border-cream-200">
                  <CardContent className="pt-4 space-y-1 text-sm">
                    {student.learningStyle && <p className="text-navy-700">{LEARNING_STYLE_LABELS[student.learningStyle] ?? student.learningStyle}</p>}
                    {student.studyHoursPerWeek != null && <p className="text-muted-foreground">{student.studyHoursPerWeek} ore/settimana</p>}
                    {student.email && <p className="text-muted-foreground">{student.email}</p>}
                    {student.phone && <p className="text-muted-foreground">{student.phone}</p>}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          {student.previousExperience && (
            <Card className="border-cream-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Esperienza precedente</CardTitle>
              </CardHeader>
              <CardContent><p className="text-sm text-navy-700">{student.previousExperience}</p></CardContent>
            </Card>
          )}
          <Card className="border-cream-200">
            <CardContent className="pt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Codice accesso studente</p>
              {student.accessCode ? (
                <div className="flex items-center gap-2">
                  <code className="font-mono text-lg font-bold text-navy-700 bg-cream-50 px-3 py-1 rounded-lg tracking-widest">{student.accessCode}</code>
                  <button onClick={() => { navigator.clipboard.writeText(student.accessCode!); toast.success('Codice copiato!') }} className="text-muted-foreground hover:text-navy-700">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nessun codice — rigenera dalla modifica</p>
              )}
              {student.email && (
                <p className="text-xs text-muted-foreground">Login: {student.email} + codice sopra</p>
              )}
              {student.email && (
                <a href="/student/login" target="_blank" className="text-xs text-coral-500 underline">Apri area studente →</a>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocks" className="mt-4 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">{pendingBlocks.length} da completare · {doneBlocks.length} completati</p>
            <Link href="/blocks/new">
              <Button size="sm" className="bg-coral-500 hover:bg-coral-600 text-white gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Nuovo blocco
              </Button>
            </Link>
          </div>

          {/* Topic filter chips */}
          {allTopics.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setTopicFilter(null)}
                className={cn(
                  'text-xs px-3 py-1 rounded-full font-medium transition-colors',
                  topicFilter === null
                    ? 'bg-navy-700 text-white'
                    : 'bg-cream-100 text-navy-700 hover:bg-cream-200',
                )}
              >
                Tutti
              </button>
              {allTopics.map(t => (
                <button
                  key={t}
                  onClick={() => setTopicFilter(t === topicFilter ? null : t)}
                  className={cn(
                    'text-xs px-3 py-1 rounded-full font-medium transition-colors',
                    topicFilter === t
                      ? 'bg-edu-blue-500 text-white'
                      : 'bg-cream-100 text-navy-700 hover:bg-cream-200',
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {blocks.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-cream-200">
              <Layers className="w-10 h-10 text-cream-200 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nessun blocco assegnato ancora</p>
              <Link href="/blocks/new">
                <Button size="sm" className="mt-3 bg-coral-500 hover:bg-coral-600 text-white">Crea il primo blocco</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingBlocks.length > 0 && (
                <div>
                  <h3 className="font-semibold text-navy-700 mb-2 flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-amber-500" /> Da completare
                  </h3>
                  <div className="space-y-3">{pendingBlocks.map(b => <BlockCard key={b.id} block={b} />)}</div>
                </div>
              )}
              {doneBlocks.length > 0 && (
                <div>
                  <h3 className="font-semibold text-navy-700 mb-2 flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" /> Completati
                  </h3>
                  <div className="space-y-3">{doneBlocks.map(b => <BlockCard key={b.id} block={b} />)}</div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <div className="bg-white rounded-2xl p-5 border border-cream-200 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-navy-700">
              <StickyNote className="w-4 h-4" /> Note private
            </div>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Scrivi note sul progresso..." rows={8} className="resize-none" />
            <Button onClick={saveNotes} size="sm" className="bg-coral-500 hover:bg-coral-600 text-white">
              {notesSaved ? '✓ Salvato' : 'Salva note'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader className="mb-6">
            <SheetTitle className="font-display text-xl text-navy-700">Modifica studente</SheetTitle>
          </SheetHeader>
          <StudentForm defaultValues={student as Partial<StudentFormData>} onSubmit={updateMutation.mutateAsync} submitLabel="Salva modifiche" />
        </SheetContent>
      </Sheet>
    </div>
  )
}
