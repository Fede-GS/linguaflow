'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Sparkles, Save, RefreshCw, Loader2, BookOpen, PenLine,
  Headphones, MessageCircle, AlignLeft, BookMarked, ChevronRight,
  Plus, Trash2, GripVertical, CheckCircle2, Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CEFR_LEVELS, CEFR_DESCRIPTIONS, EXERCISE_TYPE_LABELS } from '@/lib/utils'
import { ExercisePreview } from '@/components/exercises/ExercisePreview'
import { CefrBadge } from '@/components/students/CefrBadge'

// ── Focus → tipi logici ──────────────────────────────────────────────
const FOCUS_TYPES: Record<string, string[]> = {
  READING:    ['READING_COMP', 'TRUE_FALSE', 'MULTIPLE_CHOICE', 'SHORT_ANSWER', 'CLOZE'],
  WRITING:    ['ESSAY', 'SHORT_ANSWER', 'TRANSLATION', 'ERROR_CORRECTION', 'FILL_BLANK', 'WORD_FORMATION'],
  LISTENING:  ['LISTENING_COMP', 'DICTATION', 'TRUE_FALSE', 'MULTIPLE_CHOICE'],
  SPEAKING:   ['CONVERSATION_SIM', 'DIALOGUE_COMPLETE'],
  GRAMMAR:    ['FILL_BLANK', 'MULTIPLE_CHOICE', 'ERROR_CORRECTION', 'REORDER', 'CLOZE', 'WORD_FORMATION', 'MATCHING', 'TRUE_FALSE'],
  VOCABULARY: ['MATCHING', 'MULTIPLE_CHOICE', 'FILL_BLANK', 'WORD_FORMATION', 'TRANSLATION', 'CLOZE'],
}

const FOCUS_CONFIG = [
  { key: 'READING',    label: 'Lettura',     icon: BookOpen,      color: 'bg-blue-50 border-blue-200 text-blue-700',       active: 'bg-blue-500 border-blue-500 text-white' },
  { key: 'WRITING',    label: 'Scrittura',   icon: PenLine,       color: 'bg-purple-50 border-purple-200 text-purple-700', active: 'bg-purple-500 border-purple-500 text-white' },
  { key: 'LISTENING',  label: 'Ascolto',     icon: Headphones,    color: 'bg-green-50 border-green-200 text-green-700',    active: 'bg-green-500 border-green-500 text-white' },
  { key: 'SPEAKING',   label: 'Parlato',     icon: MessageCircle, color: 'bg-orange-50 border-orange-200 text-orange-700', active: 'bg-orange-500 border-orange-500 text-white' },
  { key: 'GRAMMAR',    label: 'Grammatica',  icon: AlignLeft,     color: 'bg-red-50 border-red-200 text-red-700',          active: 'bg-red-500 border-red-500 text-white' },
  { key: 'VOCABULARY', label: 'Vocabolario', icon: BookMarked,    color: 'bg-amber-50 border-amber-200 text-amber-700',    active: 'bg-amber-500 border-amber-500 text-white' },
]

// ── Difficoltà ──────────────────────────────────────────────────────
const DIFFICULTY_CONFIG = [
  { key: 'easy',   label: 'Facile',   color: 'bg-green-50 border-green-200 text-green-700',   active: 'bg-green-500 border-green-500 text-white',  minutesPerQ: 2 },
  { key: 'medium', label: 'Medio',    color: 'bg-amber-50 border-amber-200 text-amber-700',   active: 'bg-amber-500 border-amber-500 text-white',  minutesPerQ: 3 },
  { key: 'hard',   label: 'Difficile',color: 'bg-red-50 border-red-200 text-red-700',         active: 'bg-red-500 border-red-500 text-white',      minutesPerQ: 5 },
]

type SavedExercise = { id: string; title: string; type: string; cefrLevel: string; skillFocus: string; estimatedMinutes: number }

type BlockExercise = {
  id: string       // tmp id
  savedId?: string
  title: string
  type: string
  skillFocus: string
  topic: string
  count: number
  difficulty: string
  estimatedMinutes: number
  generated?: Record<string, unknown>
  saved: boolean
}

export default function ExerciseGeneratorPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  // ── Form corrente ──
  const [form, setForm] = useState({
    skillFocus: '',
    type: '',
    targetLanguage: 'english',
    cefrLevel: 'B1',
    topic: '',
    count: '5',
    difficulty: 'medium',
    teacherNotes: '',
    studentId: '',
  })

  const [generated, setGenerated] = useState<Record<string, unknown> | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // ── Blocco di esercizi ──
  const [block, setBlock] = useState<BlockExercise[]>([])
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [isAssigning, setIsAssigning] = useState(false)

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => fetch('/api/students').then(r => r.json()),
  })

  const { data: savedExercises = [] } = useQuery<SavedExercise[]>({
    queryKey: ['exercises'],
    queryFn: () => fetch('/api/exercises').then(r => r.json()),
  })

  // ── Calcola tempo stimato automaticamente ──
  function calcMinutes(count: number | string, difficulty: string): number {
    const n = Number(count) || 5
    const cfg = DIFFICULTY_CONFIG.find(d => d.key === difficulty) ?? DIFFICULTY_CONFIG[1]
    return Math.max(5, n * cfg.minutesPerQ)
  }
  const estimatedMinutes = calcMinutes(form.count, form.difficulty)

  const availableTypes = form.skillFocus ? FOCUS_TYPES[form.skillFocus] ?? [] : []
  const canGenerate = !!(form.skillFocus && form.type && form.topic.trim() && form.count)

  function selectFocus(key: string) { setForm(f => ({ ...f, skillFocus: key, type: '' })); setGenerated(null) }
  function selectType(key: string) { setForm(f => ({ ...f, type: key })); setGenerated(null) }

  async function generate() {
    if (!canGenerate) { toast.error('Compila focus, tipo e argomento'); return }
    setIsGenerating(true); setGenerated(null)
    try {
      const sel = students.find((s: { id: string; goal?: string; nativeLanguage?: string }) => s.id === form.studentId)
      const res = await fetch('/api/exercises/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          count: Number(form.count) || 5,
          minutes: estimatedMinutes,
          studentGoal: sel?.goal,
          studentNativeLanguage: sel?.nativeLanguage,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Errore generazione')
      setGenerated(data)
      toast.success('Esercizio generato!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Errore. Riprova.')
    } finally { setIsGenerating(false) }
  }

  async function saveAndAddToBlock() {
    if (!generated) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: (generated.title as string) || `${EXERCISE_TYPE_LABELS[form.type]} – ${form.topic}`,
          type: form.type,
          targetLanguage: form.targetLanguage,
          cefrLevel: form.cefrLevel,
          skillFocus: form.skillFocus,
          topic: form.topic,
          estimatedMinutes,
          content: generated,
          aiGenerated: true,
          geminiModel: 'gemini-2.5-flash',
          aiPromptUsed: form.topic,
          tags: [form.cefrLevel, form.skillFocus.toLowerCase(), form.topic],
        }),
      })
      const saved = await res.json()
      queryClient.invalidateQueries({ queryKey: ['exercises'] })

      const blockItem: BlockExercise = {
        id: saved.id,
        savedId: saved.id,
        title: saved.title,
        type: form.type,
        skillFocus: form.skillFocus,
        topic: form.topic,
        count: Number(form.count) || 5,
        difficulty: form.difficulty,
        estimatedMinutes,
        generated,
        saved: true,
      }
      setBlock(b => [...b, blockItem])
      setGenerated(null)

      toast.success('Aggiunto al blocco!')

      // Reset form per il prossimo esercizio
      setForm(f => ({ ...f, type: '', topic: '', count: '5', difficulty: 'medium', teacherNotes: '' }))
    } catch {
      toast.error('Errore nel salvataggio')
    } finally { setIsSaving(false) }
  }

  async function saveOnly() {
    if (!generated) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: (generated.title as string) || `${EXERCISE_TYPE_LABELS[form.type]} – ${form.topic}`,
          type: form.type, targetLanguage: form.targetLanguage, cefrLevel: form.cefrLevel,
          skillFocus: form.skillFocus, topic: form.topic, estimatedMinutes,
          content: generated, aiGenerated: true, geminiModel: 'gemini-2.5-flash',
          aiPromptUsed: form.topic, tags: [form.cefrLevel, form.skillFocus.toLowerCase(), form.topic],
        }),
      })
      const saved = await res.json()
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      toast.success('Salvato in libreria!')
      router.push(`/exercises/${saved.id}`)
    } catch { toast.error('Errore') } finally { setIsSaving(false) }
  }

  // Aggiungi dalla libreria al blocco
  function addFromLibrary(ex: SavedExercise) {
    if (block.find(b => b.savedId === ex.id)) { toast('Già nel blocco'); return }
    setBlock(b => [...b, {
      id: ex.id, savedId: ex.id, title: ex.title, type: ex.type,
      skillFocus: ex.skillFocus, topic: '', count: 5, difficulty: 'medium',
      estimatedMinutes: ex.estimatedMinutes, saved: true,
    }])
    toast.success('Aggiunto al blocco!')
  }

  function removeFromBlock(id: string) { setBlock(b => b.filter(x => x.id !== id)) }

  const blockTotalMinutes = block.reduce((acc, e) => acc + e.estimatedMinutes, 0)

  async function assignBlock() {
    if (block.length === 0 || selectedStudents.length === 0) return
    setIsAssigning(true)
    try {
      for (const ex of block) {
        if (!ex.savedId) continue
        await fetch('/api/assignments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ exerciseId: ex.savedId, studentIds: selectedStudents }),
        })
      }
      toast.success(`Blocco assegnato a ${selectedStudents.length} studente${selectedStudents.length > 1 ? 'i' : ''}!`)
      setShowAssignDialog(false); setSelectedStudents([]); setBlock([])
      router.push('/assignments')
    } catch { toast.error('Errore assegnazione') } finally { setIsAssigning(false) }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-navy-700">Genera esercizio con AI</h1>
          <p className="text-muted-foreground mt-1">Crea esercizi e raccoglili in un blocco da assegnare insieme</p>
        </div>
        {block.length > 0 && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl border border-cream-200 shadow-sm px-4 py-3 text-right flex-shrink-0">
            <p className="text-xs text-muted-foreground">Blocco corrente</p>
            <p className="font-semibold text-navy-700">{block.length} eserciz{block.length > 1 ? 'i' : 'io'} · ~{blockTotalMinutes} min</p>
            <Button size="sm" onClick={() => setShowAssignDialog(true)} className="mt-2 bg-coral-500 hover:bg-coral-600 text-white gap-1.5 text-xs w-full">
              <Users className="w-3 h-3" /> Assegna blocco
            </Button>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        {/* ── Colonna config ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Step 1 */}
          <div className="bg-white rounded-2xl p-5 border border-cream-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-coral-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
              <h2 className="font-semibold text-navy-700">Cosa vuoi allenare?</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {FOCUS_CONFIG.map(({ key, label, icon: Icon, color, active }) => (
                <button key={key} onClick={() => selectFocus(key)}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left font-medium text-sm ${form.skillFocus === key ? active : `${color} hover:opacity-80`}`}>
                  <Icon className="w-4 h-4 flex-shrink-0" />{label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2 */}
          <AnimatePresence>
            {form.skillFocus && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="bg-white rounded-2xl p-5 border border-cream-200 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-coral-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                  <h2 className="font-semibold text-navy-700">Tipo di esercizio</h2>
                </div>
                <div className="flex flex-col gap-1.5">
                  {availableTypes.map((typeKey) => (
                    <button key={typeKey} onClick={() => selectType(typeKey)}
                      className={`text-sm text-left px-3 py-2.5 rounded-xl border transition-all ${form.type === typeKey ? 'bg-navy-700 border-navy-700 text-white font-medium' : 'border-cream-200 text-navy-700 hover:bg-cream-50'}`}>
                      {EXERCISE_TYPE_LABELS[typeKey] ?? typeKey}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step 3 */}
          <AnimatePresence>
            {form.type && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="bg-white rounded-2xl p-5 border border-cream-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-coral-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
                  <h2 className="font-semibold text-navy-700">Parametri</h2>
                </div>
                <Separator />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Lingua target</Label>
                    <Select value={form.targetLanguage} onValueChange={v => setForm(f => ({ ...f, targetLanguage: v || f.targetLanguage }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="english">Inglese</SelectItem>
                        <SelectItem value="italian">Italiano</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Livello CEFR</Label>
                    <Select value={form.cefrLevel} onValueChange={v => setForm(f => ({ ...f, cefrLevel: v || f.cefrLevel }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CEFR_LEVELS.map(l => <SelectItem key={l} value={l}>{l} — {CEFR_DESCRIPTIONS[l]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Argomento / Tema <span className="text-red-500">*</span></Label>
                  <Input placeholder="es. present perfect, email formali..." value={form.topic}
                    onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter' && canGenerate) generate() }}
                    className="h-9 text-sm" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">N. domande</Label>
                    <Input type="number" min={1} max={30} placeholder="5" value={form.count}
                      onChange={e => setForm(f => ({ ...f, count: e.target.value }))}
                      className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Difficoltà</Label>
                    <Select value={form.difficulty} onValueChange={v => setForm(f => ({ ...f, difficulty: v || f.difficulty }))}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DIFFICULTY_CONFIG.map(d => <SelectItem key={d.key} value={d.key}>{d.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tempo stimato automatico */}
                <div className="flex items-center gap-2 bg-cream-50 px-3 py-2 rounded-lg">
                  <span className="text-xs text-muted-foreground">⏱ Tempo stimato:</span>
                  <span className="text-sm font-semibold text-navy-700">{estimatedMinutes} minuti</span>
                  <span className="text-xs text-muted-foreground ml-auto">({form.count || 5} dom. × {DIFFICULTY_CONFIG.find(d => d.key === form.difficulty)?.minutesPerQ} min)</span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Personalizza per studente <span className="text-muted-foreground">(opz.)</span></Label>
                  <Select value={form.studentId} onValueChange={v => setForm(f => ({ ...f, studentId: v ?? '' }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Nessuno" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nessuno</SelectItem>
                      {students.map((s: { id: string; name: string; currentLevel: string }) => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.currentLevel})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Note per l'AI <span className="text-muted-foreground">(opz.)</span></Label>
                  <Textarea placeholder="Tono formale, contesto specifico..." rows={2} value={form.teacherNotes}
                    onChange={e => setForm(f => ({ ...f, teacherNotes: e.target.value }))}
                    className="text-sm resize-none" />
                </div>

                <Button onClick={generate} disabled={isGenerating || !canGenerate}
                  className="w-full bg-coral-500 hover:bg-coral-600 text-white font-medium gap-2 h-11">
                  {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</> : <><Sparkles className="w-4 h-4" /> Genera esercizio</>}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Colonna preview + blocco ── */}
        <div className="lg:col-span-3 space-y-5">

          {/* Preview */}
          <div className="bg-white rounded-2xl border border-cream-200 shadow-sm min-h-[380px] flex flex-col sticky top-4">
            {generated && (
              <div className="flex items-center justify-between px-5 py-3 border-b border-cream-200">
                <div className="flex items-center gap-2 min-w-0">
                  <CefrBadge level={form.cefrLevel} />
                  <span className="text-sm font-medium text-navy-700 truncate">{(generated.title as string) || 'Esercizio'}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">· {estimatedMinutes} min</span>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={generate} disabled={isGenerating} className="gap-1 text-xs">
                    <RefreshCw className="w-3 h-3" /> Rigenera
                  </Button>
                  <Button variant="outline" size="sm" onClick={saveOnly} disabled={isSaving} className="gap-1 text-xs">
                    <Save className="w-3 h-3" /> Solo salva
                  </Button>
                  <Button size="sm" onClick={saveAndAddToBlock} disabled={isSaving}
                    className="bg-coral-500 hover:bg-coral-600 text-white gap-1 text-xs">
                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    Al blocco
                  </Button>
                </div>
              </div>
            )}
            <div className="flex-1 p-5 overflow-y-auto max-h-[480px]">
              <AnimatePresence mode="wait">
                {isGenerating ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    <Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" />
                    <div className="pt-3 space-y-3">{[...Array(Math.min(Number(form.count) || 5, 5))].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
                    <p className="text-center text-xs text-muted-foreground pt-3 animate-pulse">Gemini sta generando...</p>
                  </motion.div>
                ) : generated ? (
                  <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <ExercisePreview type={form.type} content={generated} />
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="h-full min-h-[300px] flex flex-col items-center justify-center text-center py-8">
                    {!form.skillFocus ? (
                      <><div className="w-16 h-16 rounded-2xl bg-coral-500/10 flex items-center justify-center mb-4"><Sparkles className="w-8 h-8 text-coral-500" /></div>
                        <h3 className="font-display text-lg text-navy-700 mb-2">Inizia scegliendo il focus</h3>
                        <p className="text-muted-foreground text-sm max-w-xs">Lettura, grammatica, vocabolario...</p></>
                    ) : !form.type ? (
                      <><ChevronRight className="w-10 h-10 text-cream-300 mx-auto mb-3" />
                        <h3 className="font-display text-base text-navy-700 mb-1">Scegli il tipo di esercizio</h3>
                        <p className="text-muted-foreground text-sm">Focus: <strong>{FOCUS_CONFIG.find(f => f.key === form.skillFocus)?.label}</strong></p></>
                    ) : (
                      <><div className="w-14 h-14 rounded-2xl bg-navy-700/5 flex items-center justify-center mb-4"><Sparkles className="w-7 h-7 text-navy-700/40" /></div>
                        <h3 className="font-display text-base text-navy-700 mb-1">Inserisci argomento e genera</h3>
                        <p className="text-muted-foreground text-sm"><strong>{EXERCISE_TYPE_LABELS[form.type]}</strong> · {form.cefrLevel}</p></>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Blocco esercizi ── */}
          <div className="bg-white rounded-2xl border border-cream-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-navy-700 flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-muted-foreground" />
                Blocco esercizi
                {block.length > 0 && <Badge variant="secondary">{block.length}</Badge>}
              </h2>
              {block.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Totale: ~{blockTotalMinutes} min</span>
                  <Button size="sm" onClick={() => setShowAssignDialog(true)} className="bg-coral-500 hover:bg-coral-600 text-white gap-1.5 text-xs">
                    <Users className="w-3 h-3" /> Assegna a studenti
                  </Button>
                </div>
              )}
            </div>

            {block.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed border-cream-200 rounded-xl">
                Genera un esercizio e clicca <strong>"Al blocco"</strong> per aggiungerlo qui.<br />
                Poi assegna tutto insieme a uno o più studenti.
              </p>
            ) : (
              <div className="space-y-2">
                {block.map((ex, i) => {
                  const focusCfg = FOCUS_CONFIG.find(f => f.key === ex.skillFocus)
                  const FocusIcon = focusCfg?.icon ?? BookOpen
                  return (
                    <motion.div key={ex.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-3 bg-cream-50 rounded-xl border border-cream-200">
                      <FocusIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-navy-700 truncate">{ex.title}</p>
                        <p className="text-xs text-muted-foreground">{EXERCISE_TYPE_LABELS[ex.type]} · {ex.estimatedMinutes} min</p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <button onClick={() => removeFromBlock(ex.id)} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* Aggiungi da libreria */}
            {savedExercises.length > 0 && (
              <details className="group">
                <summary className="text-xs text-coral-500 cursor-pointer hover:underline mt-2">+ Aggiungi dalla libreria esistente</summary>
                <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                  {savedExercises.filter(e => !block.find(b => b.savedId === e.id)).map(ex => (
                    <button key={ex.id} onClick={() => addFromLibrary(ex)}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cream-100 transition-colors">
                      <Plus className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-navy-700 truncate">{ex.title}</span>
                      <CefrBadge level={ex.cefrLevel} />
                    </button>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      </div>

      {/* ── Dialog assegna blocco ── */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-navy-700">Assegna blocco a studenti</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-cream-50 rounded-xl p-3 space-y-1">
              <p className="text-xs font-medium text-navy-700">Esercizi nel blocco ({block.length}):</p>
              {block.map(ex => (
                <p key={ex.id} className="text-xs text-muted-foreground">· {ex.title} ({ex.estimatedMinutes} min)</p>
              ))}
              <p className="text-xs font-semibold text-navy-700 pt-1">Totale: ~{blockTotalMinutes} min</p>
            </div>
            <Separator />
            <p className="text-sm font-medium text-navy-700">Seleziona studenti:</p>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {students.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-3">Nessuno studente</p>
                : students.map((s: { id: string; name: string; currentLevel: string }) => (
                  <label key={s.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-cream-50 cursor-pointer">
                    <input type="checkbox" checked={selectedStudents.includes(s.id)}
                      onChange={() => setSelectedStudents(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])}
                      className="accent-coral-500" />
                    <span className="text-sm font-medium text-navy-700 flex-1">{s.name}</span>
                    <CefrBadge level={s.currentLevel} />
                  </label>
                ))}
            </div>
            <Button onClick={assignBlock} disabled={selectedStudents.length === 0 || isAssigning}
              className="w-full bg-coral-500 hover:bg-coral-600 text-white gap-2">
              {isAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              Assegna a {selectedStudents.length > 0 ? `${selectedStudents.length} student${selectedStudents.length > 1 ? 'i' : 'e'}` : 'studenti'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
