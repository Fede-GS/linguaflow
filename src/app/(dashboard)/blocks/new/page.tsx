'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  Sparkles, BookOpen, Plus, Trash2,
  Tag, X, Calendar, AlignLeft, Send, Loader2,
  Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight,
  FolderPlus, FolderOpen, Archive, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn, EXERCISE_TYPE_LABELS } from '@/lib/utils'
import { ExercisePreview } from '@/components/exercises/ExercisePreview'
import { AvatarInitials } from '@/components/ui/lf-components'
import { useLanguage } from '@/contexts/LanguageContext'

// ─── Types ────────────────────────────────────────
type Student = {
  id: string; name: string; currentLevel: string; targetLanguage: string
}

type GeneratedExercise = {
  title: string; type: string; skillFocus: string; cefrLevel: string
  estimatedMinutes: number; content: unknown; answerKey: unknown; topic: string
}

type BlockItem = {
  localId: string
  exercise: GeneratedExercise
  savedId?: string
  topicLabel: string
  expanded: boolean
}

type ExistingBlock = {
  id: string
  title: string
  status: string
  items: { id: string }[]
}

// Step 2 choices after generating an exercise
type BlockChoice = 'new' | 'existing' | 'library' | null

// ─── Constants ────────────────────────────────────
const FOCUS_CONFIG: Record<string, { emoji: string; labelIt: string; labelEn: string; color: string; types: string[] }> = {
  READING:    { emoji: '📖', labelIt: 'Lettura',    labelEn: 'Reading',    color: 'bg-blue-50 border-blue-200 text-blue-700',
    types: ['READING_COMP', 'TRUE_FALSE', 'MULTIPLE_CHOICE', 'SHORT_ANSWER', 'CLOZE'] },
  WRITING:    { emoji: '✍️', labelIt: 'Scrittura',  labelEn: 'Writing',   color: 'bg-purple-50 border-purple-200 text-purple-700',
    types: ['ESSAY', 'SHORT_ANSWER', 'TRANSLATION', 'ERROR_CORRECTION', 'FILL_BLANK', 'WORD_FORMATION'] },
  LISTENING:  { emoji: '🎧', labelIt: 'Ascolto',    labelEn: 'Listening',  color: 'bg-amber-50 border-amber-200 text-amber-700',
    types: ['LISTENING_COMP', 'DICTATION', 'TRUE_FALSE', 'MULTIPLE_CHOICE'] },
  SPEAKING:   { emoji: '🗣️', labelIt: 'Parlato',   labelEn: 'Speaking',  color: 'bg-green-50 border-green-200 text-green-700',
    types: ['CONVERSATION_SIM', 'DIALOGUE_COMPLETE'] },
  GRAMMAR:    { emoji: '📐', labelIt: 'Grammatica', labelEn: 'Grammar',   color: 'bg-rose-50 border-rose-200 text-rose-700',
    types: ['FILL_BLANK', 'MULTIPLE_CHOICE', 'ERROR_CORRECTION', 'REORDER', 'CLOZE', 'WORD_FORMATION', 'MATCHING', 'TRUE_FALSE'] },
  VOCABULARY: { emoji: '📚', labelIt: 'Vocabolario',labelEn: 'Vocabulary',color: 'bg-teal-50 border-teal-200 text-teal-700',
    types: ['MATCHING', 'MULTIPLE_CHOICE', 'FILL_BLANK', 'WORD_FORMATION', 'TRANSLATION', 'CLOZE'] },
}

const DIFFICULTY_CONFIG = [
  { key: 'easy',   labelIt: 'Facile',    labelEn: 'Easy',    emoji: '🟢', minutesPerQ: 2 },
  { key: 'medium', labelIt: 'Medio',     labelEn: 'Medium',  emoji: '🟡', minutesPerQ: 3 },
  { key: 'hard',   labelIt: 'Difficile', labelEn: 'Hard',    emoji: '🔴', minutesPerQ: 5 },
] as const

type Difficulty = (typeof DIFFICULTY_CONFIG)[number]['key']

function calcMinutes(count: number, difficulty: Difficulty): number {
  return Math.max(5, count * (DIFFICULTY_CONFIG.find(d => d.key === difficulty)?.minutesPerQ ?? 3))
}

// ─── Step badge ───────────────────────────────────
function StepBadge({ n, done }: { n: number; done?: boolean }) {
  return (
    <div className={cn(
      'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0',
      done ? 'bg-emerald-500 text-white' : 'bg-coral-500 text-white',
    )}>
      {done ? '✓' : n}
    </div>
  )
}

// ─── Live mock preview ────────────────────────────
function ExerciseMockPreview({ type, topic }: { type: string; topic: string }) {
  const topicLabel = topic.trim() || 'Exercise topic'
  const muted = 'text-navy-700/30'
  const line = 'bg-navy-700/8 rounded'

  const MockLine = ({ w = 'full', className = '' }: { w?: string; className?: string }) => (
    <div className={cn('h-3 rounded', line, `w-${w}`, className)} />
  )

  switch (type) {
    case 'MULTIPLE_CHOICE':
      return (
        <div className="space-y-4 py-1">
          <div className="space-y-1.5"><MockLine w="3/4" /><MockLine w="full" /><MockLine w="1/2" /></div>
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-navy-700/15 flex-shrink-0" />
              <MockLine w={i % 2 === 0 ? '2/3' : '1/2'} />
            </div>
          ))}
        </div>
      )
    case 'FILL_BLANK':
      return (
        <div className="space-y-3 py-1">
          <p className={cn('text-sm leading-7', muted)}>
            Yesterday she{' '}
            <span className="inline-block w-20 h-5 bg-navy-700/10 rounded border border-dashed border-navy-700/20 align-middle" />{' '}
            to the market and{' '}
            <span className="inline-block w-16 h-5 bg-navy-700/10 rounded border border-dashed border-navy-700/20 align-middle" />{' '}
            some fresh bread.
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-navy-700/8">
            {['went', 'bought', 'said', 'took'].map(w => (
              <span key={w} className={cn('text-xs px-2.5 py-1 rounded-full border border-navy-700/12 bg-cream-50', muted)}>{w}</span>
            ))}
          </div>
        </div>
      )
    case 'TRUE_FALSE':
      return (
        <div className="space-y-2.5 py-1">
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg border border-navy-700/8 bg-cream-50/50">
              <MockLine w={i === 2 ? '3/4' : 'full'} className="flex-1" />
              <div className="flex gap-1 flex-shrink-0">
                <span className={cn('text-xs px-2 py-0.5 rounded border border-navy-700/12', muted)}>V</span>
                <span className={cn('text-xs px-2 py-0.5 rounded border border-navy-700/12', muted)}>F</span>
              </div>
            </div>
          ))}
        </div>
      )
    case 'MATCHING':
      return (
        <div className="space-y-2 py-1">
          {[1,2,3,4].map(i => (
            <div key={i} className="grid grid-cols-[1fr,auto,1fr] items-center gap-2">
              <div className={cn('text-xs px-2.5 py-1.5 rounded-lg border border-navy-700/12 bg-cream-50/50', muted)}>{'─'.repeat(8 + i * 2)}</div>
              <div className="w-px h-4 bg-navy-700/12" />
              <div className={cn('text-xs px-2.5 py-1.5 rounded-lg border border-dashed border-navy-700/15 bg-cream-50/30', muted)}>{'─'.repeat(6 + i)}</div>
            </div>
          ))}
        </div>
      )
    case 'SHORT_ANSWER':
      return (
        <div className="space-y-4 py-1">
          {[1,2].map(i => (
            <div key={i} className="space-y-1.5">
              <MockLine w={i === 1 ? '3/4' : '2/3'} />
              <div className="h-12 border border-dashed border-navy-700/15 rounded-lg bg-cream-50/40" />
            </div>
          ))}
        </div>
      )
    case 'ESSAY':
      return (
        <div className="space-y-3 py-1">
          <div className="space-y-1.5"><MockLine w="full" /><MockLine w="4/5" /></div>
          <div className="h-24 border border-dashed border-navy-700/15 rounded-lg bg-cream-50/40" />
        </div>
      )
    case 'REORDER':
      return (
        <div className="space-y-2 py-1">
          {['B', 'D', 'A', 'C'].map((l, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg border border-navy-700/10 bg-cream-50/50 cursor-grab">
              <span className={cn('text-xs font-bold w-5 text-center', muted)}>{l}</span>
              <MockLine w={i % 2 === 0 ? 'full' : '3/4'} className="flex-1" />
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                {[0,1,2].map(k => <div key={k} className="w-3 h-0.5 bg-navy-700/15 rounded" />)}
              </div>
            </div>
          ))}
        </div>
      )
    default:
      return (
        <div className="space-y-2 py-1">
          <MockLine w="full" /><MockLine w="3/4" /><MockLine w="4/5" />
        </div>
      )
  }
  void topicLabel
}

// ─── Main component ────────────────────────────────
export default function NewBlockPage() {
  const router = useRouter()
  const { t, lang } = useLanguage()
  const tc = t.create

  // Exercise config
  const [focus, setFocus] = useState<string | null>(null)
  const [exerciseType, setExerciseType] = useState<string | null>(null)
  const [cefrLevel, setCefrLevel] = useState('B1')
  const [topic, setTopic] = useState('')
  const [count, setCount] = useState(5)
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [generating, setGenerating] = useState(false)
  const [currentExercise, setCurrentExercise] = useState<GeneratedExercise | null>(null)
  const [topicLabel, setTopicLabel] = useState('')

  // Step 2: block choice
  const [blockChoice, setBlockChoice] = useState<BlockChoice>(null)
  const [savedExerciseId, setSavedExerciseId] = useState<string | null>(null)

  // Block state (new block)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [blockTitle, setBlockTitle] = useState('')
  const [blockTopics, setBlockTopics] = useState<string[]>([])
  const [topicInput, setTopicInput] = useState('')
  const [blockComments, setBlockComments] = useState('')
  const [blockDueDate, setBlockDueDate] = useState('')
  const [blockItems, setBlockItems] = useState<BlockItem[]>([])
  const [assigning, setAssigning] = useState(false)

  // Existing block
  const [selectedExistingBlockId, setSelectedExistingBlockId] = useState<string | null>(null)
  const [addingToExisting, setAddingToExisting] = useState(false)

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: () => fetch('/api/students').then(r => r.json()),
  })

  const { data: existingBlocks = [] } = useQuery<ExistingBlock[]>({
    queryKey: ['blocks', selectedStudent?.id],
    queryFn: () => fetch(`/api/blocks?studentId=${selectedStudent!.id}`).then(r => r.json()),
    enabled: !!selectedStudent && blockChoice === 'existing',
  })

  useEffect(() => { if (selectedStudent) setCefrLevel(selectedStudent.currentLevel) }, [selectedStudent])
  useEffect(() => {
    if (selectedStudent && !blockTitle) setBlockTitle(`${lang === 'en' ? 'Exercise block' : 'Blocco esercizi'} — ${selectedStudent.name}`)
  }, [selectedStudent, blockTitle, lang])

  const addTopic = useCallback(() => {
    const tv = topicInput.trim()
    if (tv && !blockTopics.includes(tv)) { setBlockTopics(prev => [...prev, tv]); setTopicInput('') }
  }, [topicInput, blockTopics])

  // Clear generated exercise when config changes
  useEffect(() => {
    setCurrentExercise(null)
    setBlockChoice(null)
    setSavedExerciseId(null)
  }, [focus, exerciseType, topic, count, difficulty])

  // Step 1 is complete when exercise is generated
  const step1Done = currentExercise !== null
  // Step 2 is visible only after step 1
  const step2Visible = step1Done
  // Step 2 is done when choice made + exercise saved
  const step2Done = step1Done && blockChoice !== null && savedExerciseId !== null
  // Step 3 visible only after step 2 (and only for new block)
  const step3Visible = step2Done && blockChoice === 'new'

  async function generate() {
    if (!focus || !exerciseType) return toast.error(tc.selectFocusAndType)
    if (!topic.trim()) return toast.error(tc.insertTopic)
    setGenerating(true)
    setCurrentExercise(null)
    setBlockChoice(null)
    setSavedExerciseId(null)
    try {
      const res = await fetch('/api/exercises/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: exerciseType, cefrLevel,
          targetLanguage: selectedStudent?.targetLanguage ?? 'english',
          skillFocus: focus, topic: topic.trim(), count, difficulty,
        }),
      })
      if (!res.ok) throw new Error('Generation error')
      const data = await res.json() as Record<string, unknown>
      setCurrentExercise({
        title: (data.title as string) ?? `${EXERCISE_TYPE_LABELS[exerciseType]} — ${topic.trim()}`,
        type: exerciseType, skillFocus: focus, cefrLevel, topic: topic.trim(),
        estimatedMinutes: calcMinutes(count, difficulty),
        content: data, answerKey: data.answerKey ?? null,
      })
      toast.success(tc.generatedSuccess)
    } catch {
      toast.error(tc.generationError)
    } finally {
      setGenerating(false)
    }
  }

  async function saveExercise(): Promise<string | null> {
    if (!currentExercise) return null
    try {
      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentExercise.title ?? `${EXERCISE_TYPE_LABELS[currentExercise.type]} — ${currentExercise.topic}`,
          type: currentExercise.type, skillFocus: currentExercise.skillFocus,
          cefrLevel: currentExercise.cefrLevel,
          targetLanguage: selectedStudent?.targetLanguage ?? 'english',
          topic: currentExercise.topic, content: currentExercise.content,
          answerKey: currentExercise.answerKey,
          estimatedMinutes: currentExercise.estimatedMinutes, aiGenerated: true,
        }),
      })
      if (!res.ok) throw new Error('Save error')
      const saved = await res.json()
      return saved.id as string
    } catch {
      toast.error(tc.saveError)
      return null
    }
  }

  async function handleChoiceNewBlock() {
    setBlockChoice('new')
    if (!savedExerciseId) {
      const id = await saveExercise()
      if (!id) { setBlockChoice(null); return }
      setSavedExerciseId(id)
      if (currentExercise) {
        setBlockItems(prev => [...prev, {
          localId: crypto.randomUUID(), exercise: currentExercise,
          savedId: id, topicLabel: topicLabel || currentExercise.topic, expanded: false,
        }])
        setTopicLabel('')
      }
    }
  }

  async function handleChoiceExistingBlock() {
    setBlockChoice('existing')
    if (!savedExerciseId) {
      const id = await saveExercise()
      if (!id) { setBlockChoice(null); return }
      setSavedExerciseId(id)
    }
  }

  async function handleChoiceLibrary() {
    setBlockChoice('library')
    if (!savedExerciseId) {
      const id = await saveExercise()
      if (!id) { setBlockChoice(null); return }
      setSavedExerciseId(id)
    }
    toast.success(tc.savedToLibraryMsg)
  }

  async function addToExistingBlock() {
    if (!selectedExistingBlockId || !savedExerciseId || !currentExercise) return
    setAddingToExisting(true)
    try {
      const res = await fetch(`/api/blocks/${selectedExistingBlockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addItem: { exerciseId: savedExerciseId, topicLabel: topicLabel || currentExercise.topic },
        }),
      })
      if (!res.ok) throw new Error()
      toast.success(tc.addedToBlock)
      // Reset for next exercise
      setCurrentExercise(null)
      setBlockChoice(null)
      setSavedExerciseId(null)
      setTopicLabel('')
    } catch {
      toast.error(tc.assignError)
    } finally {
      setAddingToExisting(false)
    }
  }

  function continueAdding() {
    setCurrentExercise(null)
    setBlockChoice(null)
    setSavedExerciseId(null)
    setTopicLabel('')
    // Keep the block items and choice context
  }

  function removeFromBlock(localId: string) { setBlockItems(prev => prev.filter(i => i.localId !== localId)) }
  function toggleExpand(localId: string) {
    setBlockItems(prev => prev.map(i => i.localId === localId ? { ...i, expanded: !i.expanded } : i))
  }

  async function assignBlock() {
    if (!selectedStudent) return toast.error(tc.selectStudentError)
    if (!blockTitle.trim()) return toast.error(tc.blockTitleError)
    if (blockItems.length === 0) return toast.error(tc.noExerciseError)
    setAssigning(true)
    try {
      const res = await fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id, title: blockTitle.trim(), topics: blockTopics,
          comments: blockComments.trim() || null, dueDate: blockDueDate || null,
          items: blockItems.map(i => ({ exerciseId: i.savedId, topicLabel: i.topicLabel })),
        }),
      })
      if (!res.ok) throw new Error()
      toast.success(tc.blockAssigned.replace('{name}', selectedStudent.name))
      router.push(`/students/${selectedStudent.id}`)
    } catch {
      toast.error(tc.assignError)
    } finally {
      setAssigning(false)
    }
  }

  const estimatedMinutes = calcMinutes(count, difficulty)
  const availableTypes = focus ? FOCUS_CONFIG[focus].types : []
  const showLivePreview = exerciseType !== null && !currentExercise
  const activeBlocks = existingBlocks.filter(b => b.status === 'ASSIGNED' || b.status === 'IN_PROGRESS')

  return (
    <div className="flex gap-5 min-h-[calc(100vh-7rem)]">
      {/* ── Left: Builder ────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-700">{tc.pageTitle}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{tc.pageSubtitle}</p>
        </div>

        {/* ── STEP 1: Generate exercise ─────────────── */}
        <section className="bg-white rounded-2xl border border-cream-200 p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-center gap-2 text-xs font-semibold text-navy-700 uppercase tracking-wide mb-3">
            <StepBadge n={1} done={step1Done} />
            {tc.step1Title}
          </div>

          {/* Student selector (optional but useful for CEFR) */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">{tc.student}</Label>
              <Select onValueChange={v => setSelectedStudent(students.find(s => s.id === v) ?? null)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={tc.selectStudent} />
                </SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} <span className="text-muted-foreground text-xs">({s.currentLevel})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tc.cefrLevel}</Label>
              <Select value={cefrLevel} onValueChange={v => setCefrLevel(v || 'B1')}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['A1','A2','B1','B2','C1','C2'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Focus grid */}
          <div className="space-y-2 mb-3">
            <p className="text-xs text-muted-foreground font-medium">{tc.skillFocus}</p>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.entries(FOCUS_CONFIG).map(([key, cfg]) => (
                <button key={key}
                  onClick={() => { setFocus(focus === key ? null : key); setExerciseType(null) }}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-2 rounded-xl border-2 text-xs font-medium transition-all text-left',
                    focus === key ? cfg.color + ' border-current' : 'border-cream-200 hover:border-cream-300 text-navy-700',
                  )}
                >
                  <span className="text-sm">{cfg.emoji}</span>
                  <span>{lang === 'en' ? cfg.labelEn : cfg.labelIt}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Exercise type */}
          {focus && (
            <div className="space-y-2 mb-3">
              <p className="text-xs text-muted-foreground font-medium">{tc.exerciseType}</p>
              <div className="flex flex-wrap gap-1.5">
                {availableTypes.map(et => (
                  <button key={et}
                    onClick={() => setExerciseType(exerciseType === et ? null : et)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg border text-xs font-medium transition-all',
                      exerciseType === et
                        ? 'bg-navy-800 text-white border-navy-800'
                        : 'border-cream-200 text-navy-700 hover:border-navy-300',
                    )}
                  >
                    {EXERCISE_TYPE_LABELS[et]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Parameters */}
          {exerciseType && (
            <div className="border-t border-cream-100 pt-3 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">{tc.topic} <span className="text-red-400">*</span></Label>
                  <Input value={topic} onChange={e => setTopic(e.target.value)}
                    placeholder={tc.topicPlaceholder} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{tc.numQuestions}</Label>
                  <Input type="number" min={1} max={20} value={count}
                    onChange={e => setCount(Math.max(1, Math.min(20, Number(e.target.value))))}
                    className="h-8 text-sm" />
                </div>
              </div>

              <div className="flex gap-1.5">
                {DIFFICULTY_CONFIG.map(d => (
                  <button key={d.key} onClick={() => setDifficulty(d.key)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-xl border-2 text-xs font-medium transition-all',
                      difficulty === d.key ? 'border-coral-500 bg-coral-50 text-coral-700' : 'border-cream-200 text-navy-700 hover:border-cream-300',
                    )}
                  >
                    <span>{d.emoji}</span> {lang === 'en' ? d.labelEn : d.labelIt}
                  </button>
                ))}
                <span className="text-xs text-muted-foreground self-center ml-1 tabular-nums">{estimatedMinutes} {t.common.minutes}</span>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{tc.studentLabel} <span className="text-muted-foreground">({t.common.optional})</span></Label>
                <Input value={topicLabel} onChange={e => setTopicLabel(e.target.value)}
                  placeholder={tc.studentLabelPlaceholder.replace('{topic}', topic || 'topic')} className="h-8 text-sm" />
              </div>

              <Button onClick={generate} disabled={generating || !topic.trim()}
                className="w-full bg-coral-500 hover:bg-coral-600 text-white gap-2 h-9">
                {generating
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> {tc.generatingBtn}</>
                  : <><Sparkles className="w-4 h-4" /> {tc.generateBtn}</>}
              </Button>
            </div>
          )}
        </section>

        {/* ── Preview / Generated result ────────────── */}
        {(showLivePreview || currentExercise) && (
          <section className={cn(
            'rounded-2xl border-2 overflow-hidden',
            currentExercise ? 'border-coral-200' : 'border-navy-700/10',
          )}>
            <div className={cn(
              'px-4 py-2.5 flex items-center justify-between',
              currentExercise ? 'bg-coral-50' : 'bg-cream-50',
            )}>
              <div className="flex items-center gap-2">
                {currentExercise
                  ? <CheckCircle2 className="w-4 h-4 text-coral-500" />
                  : <Eye className="w-4 h-4 text-navy-700/30" />}
                <span className={cn('text-sm font-semibold', currentExercise ? 'text-coral-700' : 'text-navy-700/40')}>
                  {currentExercise ? `${tc.generatedTitle} — ${currentExercise.title}` : tc.previewTitle}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {exerciseType && (
                  <span className="text-xs bg-white/70 text-navy-700/50 px-2 py-0.5 rounded-md border border-navy-700/10">
                    {EXERCISE_TYPE_LABELS[exerciseType]}
                  </span>
                )}
                {currentExercise && (
                  <span className="text-xs bg-white/70 text-navy-700/50 px-2 py-0.5 rounded-md border border-navy-700/10">
                    {currentExercise.estimatedMinutes} {t.common.minutes}
                  </span>
                )}
              </div>
            </div>
            <div className="bg-white p-4 max-h-72 overflow-y-auto">
              {currentExercise
                ? <ExercisePreview key={currentExercise.title} content={currentExercise.content as Record<string, unknown>} type={currentExercise.type} skillFocus={currentExercise.skillFocus} />
                : exerciseType && (
                  <>
                    <ExerciseMockPreview type={exerciseType} topic={topic} />
                    <p className="text-[10px] text-navy-700/30 mt-3 flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 rounded-full bg-navy-700/15" />
                      {tc.exampleNote}
                    </p>
                  </>
                )}
            </div>
            {currentExercise && (
              <div className="bg-cream-50 px-4 py-3 flex gap-2 border-t border-cream-200">
                <Button variant="outline" onClick={generate} disabled={generating} className="gap-1.5 h-8 text-sm">
                  {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {tc.regenerateBtn}
                </Button>
              </div>
            )}
          </section>
        )}

        {/* ── STEP 2: Where to put the exercise? ───── */}
        {step2Visible && (
          <section className="bg-white rounded-2xl border border-cream-200 p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2 text-xs font-semibold text-navy-700 uppercase tracking-wide mb-3">
              <StepBadge n={2} done={step2Done} />
              {tc.step2Title}
            </div>
            <p className="text-xs text-muted-foreground mb-3">{tc.step2Subtitle}</p>

            {!blockChoice ? (
              <div className="grid grid-cols-3 gap-2">
                {/* New block */}
                <button
                  onClick={handleChoiceNewBlock}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-cream-200 hover:border-coral-300 hover:bg-coral-50/30 transition-all group text-center"
                >
                  <div className="w-9 h-9 rounded-xl bg-coral-50 border border-coral-200 flex items-center justify-center group-hover:bg-coral-100 transition-colors">
                    <FolderPlus className="w-4.5 h-4.5 text-coral-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-navy-700">{tc.addToNewBlock}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{tc.addToNewBlockDesc}</p>
                  </div>
                </button>

                {/* Existing block */}
                <button
                  onClick={handleChoiceExistingBlock}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-cream-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all group text-center"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <FolderOpen className="w-4.5 h-4.5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-navy-700">{tc.addToExistingBlock}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{tc.addToExistingBlockDesc}</p>
                  </div>
                </button>

                {/* Library only */}
                <button
                  onClick={handleChoiceLibrary}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border-2 border-cream-200 hover:border-slate-300 hover:bg-slate-50/30 transition-all group text-center"
                >
                  <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                    <Archive className="w-4.5 h-4.5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-navy-700">{tc.saveToLibrary}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{tc.saveToLibraryDesc}</p>
                  </div>
                </button>
              </div>
            ) : blockChoice === 'library' ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <Archive className="w-4 h-4 text-slate-500" />
                  <p className="text-sm font-medium text-navy-700">{tc.savedToLibrary}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={continueAdding} className="h-7 text-xs gap-1">
                    <Plus className="w-3 h-3" /> {tc.continueAdding}
                  </Button>
                </div>
              </div>
            ) : blockChoice === 'existing' ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{tc.pickExistingBlock}</Label>
                  {!selectedStudent ? (
                    <p className="text-xs text-amber-600 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" /> {tc.needStudent}
                    </p>
                  ) : activeBlocks.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{tc.noExistingBlocks}</p>
                  ) : (
                    <Select onValueChange={(v: string | null) => setSelectedExistingBlockId(v)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder={tc.pickBlockPlaceholder} />
                      </SelectTrigger>
                      <SelectContent>
                        {activeBlocks.map(b => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.title} <span className="text-muted-foreground text-xs">({b.items.length} esercizi)</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={addToExistingBlock}
                    disabled={!selectedExistingBlockId || addingToExisting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2 h-8 text-sm"
                  >
                    {addingToExisting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5" />}
                    {tc.addToExistingBlock}
                  </Button>
                  <Button variant="outline" size="sm" onClick={continueAdding} className="h-8 text-xs gap-1">
                    <Plus className="w-3 h-3" /> {tc.continueAdding}
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        )}

        {/* ── STEP 3: Block details (only for new block) */}
        {step3Visible && (
          <section className="bg-white rounded-2xl border border-cream-200 p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2 text-xs font-semibold text-navy-700 uppercase tracking-wide mb-3">
              <StepBadge n={3} />
              {tc.step3Title}
            </div>
            <p className="text-xs text-muted-foreground mb-3">{tc.step3Subtitle}</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{tc.blockTitle} <span className="text-red-400">*</span></Label>
                <Input value={blockTitle} onChange={e => setBlockTitle(e.target.value)}
                  placeholder={tc.blockTitlePlaceholder} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1"><Calendar className="w-3 h-3" /> {tc.dueDate} <span className="text-muted-foreground">({t.common.optional})</span></Label>
                <Input type="date" value={blockDueDate} onChange={e => setBlockDueDate(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1"><Tag className="w-3 h-3" /> {tc.topics}</Label>
                <div className="flex gap-1.5">
                  <Input value={topicInput} onChange={e => setTopicInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTopic())}
                    placeholder={tc.topicsPlaceholder} className="h-8 text-sm flex-1" />
                  <Button type="button" variant="outline" size="sm" onClick={addTopic} className="h-8 px-2">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {blockTopics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {blockTopics.map(tp => (
                      <Badge key={tp} variant="secondary" className="gap-1 pr-1 text-xs h-5">
                        {tp}
                        <button onClick={() => setBlockTopics(prev => prev.filter(x => x !== tp))} className="hover:text-red-500">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1"><AlignLeft className="w-3 h-3" /> {tc.comments} <span className="text-muted-foreground">({t.common.optional})</span></Label>
                <Input value={blockComments} onChange={e => setBlockComments(e.target.value)}
                  placeholder={tc.commentsPlaceholder} className="h-8 text-sm" />
              </div>
            </div>

            {/* Continue adding exercises */}
            <div className="mt-3 p-3 rounded-xl bg-cream-50 border border-cream-200 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{blockItems.length} {t.common.exercises} · {blockItems.reduce((acc, i) => acc + i.exercise.estimatedMinutes, 0)} {t.common.minutes} {t.common.total}</p>
              <Button variant="outline" size="sm" onClick={continueAdding} className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" /> {tc.continueAdding}
              </Button>
            </div>
          </section>
        )}
      </div>

      {/* ── Right: Block panel ───────────────────────── */}
      <div className="w-72 flex-shrink-0">
        <div className="sticky top-4 space-y-3">
          <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden shadow-[var(--shadow-md)]">
            {/* Header */}
            <div className="bg-navy-800 px-4 py-3.5">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="w-3.5 h-3.5 text-coral-400" />
                <h2 className="font-semibold text-white text-sm">{tc.currentBlock}</h2>
              </div>
              {blockTitle
                ? <p className="text-white/70 text-xs truncate">{blockTitle}</p>
                : <p className="text-white/25 text-xs italic">{tc.noTitle}</p>}
              {selectedStudent && (
                <div className="flex items-center gap-1.5 mt-2">
                  <AvatarInitials name={selectedStudent.name} size="xs" color="coral" />
                  <p className="text-coral-300 text-xs">{selectedStudent.name} · {selectedStudent.currentLevel}</p>
                </div>
              )}
            </div>

            {/* Topics */}
            {blockTopics.length > 0 && (
              <div className="px-3 py-2.5 bg-blue-50/60 border-b border-blue-100">
                <div className="flex flex-wrap gap-1">
                  {blockTopics.map(tp => (
                    <span key={tp} className="text-[10px] bg-white text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full">{tp}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Exercises */}
            <div className="divide-y divide-cream-100">
              {blockItems.length === 0 ? (
                <div className="py-8 text-center px-4">
                  <AlertCircle className="w-7 h-7 text-cream-200 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">{tc.noExercise}</p>
                </div>
              ) : blockItems.map((item, idx) => (
                <div key={item.localId} className="p-3">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-coral-500 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-navy-700 leading-tight truncate">
                        {item.exercise.title ?? EXERCISE_TYPE_LABELS[item.exercise.type]}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {EXERCISE_TYPE_LABELS[item.exercise.type]} · {item.exercise.estimatedMinutes} {t.common.minutes}
                      </p>
                      {item.topicLabel && (
                        <p className="text-[10px] text-blue-600 mt-0.5 flex items-center gap-1">
                          <ArrowRight className="w-2.5 h-2.5" /> {item.topicLabel}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => toggleExpand(item.localId)}
                        className="p-1 rounded hover:bg-cream-100 text-muted-foreground hover:text-navy-700 transition-colors">
                        {item.expanded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                      <button onClick={() => removeFromBlock(item.localId)}
                        className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  {item.expanded && (
                    <div className="mt-2 p-2 bg-cream-50 rounded-lg max-h-40 overflow-y-auto">
                      <ExercisePreview content={item.exercise.content as Record<string, unknown>} type={item.exercise.type} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {blockItems.length > 0 && (
              <div className="px-3 py-2.5 bg-cream-50 border-t border-cream-200 text-[10px] text-muted-foreground tabular-nums">
                {blockItems.length} {t.common.exercises} · {blockItems.reduce((acc, i) => acc + i.exercise.estimatedMinutes, 0)} {t.common.minutes} {t.common.total}
              </div>
            )}
          </div>

          {/* Assign (only visible for new block + step 3 active) */}
          {(blockChoice === 'new' || blockItems.length > 0) && (
            <>
              <Button onClick={assignBlock}
                disabled={assigning || !selectedStudent || blockItems.length === 0 || !blockTitle.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-10 rounded-xl shadow-sm">
                {assigning
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> {tc.assigningBtn}</>
                  : <><Send className="w-4 h-4" /> {selectedStudent ? tc.assignBlock.replace('{name}', selectedStudent.name) : tc.assignBlockDefault}</>}
              </Button>

              {(!selectedStudent || blockItems.length === 0 || !blockTitle.trim()) && (
                <div className="text-[10px] text-muted-foreground space-y-1 bg-cream-50 rounded-xl p-2.5 border border-cream-200">
                  {!selectedStudent && <p className="flex items-center gap-1.5"><AlertCircle className="w-3 h-3 text-amber-400" /> {tc.needStudent}</p>}
                  {!blockTitle.trim() && <p className="flex items-center gap-1.5"><AlertCircle className="w-3 h-3 text-amber-400" /> {tc.needTitle}</p>}
                  {blockItems.length === 0 && <p className="flex items-center gap-1.5"><AlertCircle className="w-3 h-3 text-amber-400" /> {tc.needExercise}</p>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
