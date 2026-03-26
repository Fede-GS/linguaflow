'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, Plus, Check, X,
  Clock, BookOpen, MapPin, Loader2, AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { AvatarInitials } from '@/components/ui/lf-components'
import { cn } from '@/lib/utils'

// ─── Types ──────────────────────────────────────
type Student = { id: string; name: string }

type Appointment = {
  id: string; title: string; description?: string; location?: string
  startTime: string; endTime: string; status: string; proposedBy: string
  student: { id: string; name: string }
}

type Block = {
  id: string; title: string; dueDate?: string; status: string
  student: { id: string; name: string }
  items: { id: string }[]
}

type CalEvent = {
  id: string
  kind: 'lesson' | 'pending' | 'deadline'
  date: Date
  title: string
  time: string
  studentName: string
  extra?: string
}

// ─── Constants ──────────────────────────────────
const DAYS = ['L', 'M', 'M', 'G', 'V', 'S', 'D']
const MONTHS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']

const KIND = {
  lesson:   { dot: 'bg-coral-500',    pill: 'bg-coral-50 text-coral-700',   icon: <Clock className="w-3 h-3" /> },
  pending:  { dot: 'bg-amber-400',    pill: 'bg-amber-50 text-amber-700',   icon: <Clock className="w-3 h-3" /> },
  deadline: { dot: 'bg-edu-blue-500', pill: 'bg-edu-blue-50 text-edu-blue-700', icon: <BookOpen className="w-3 h-3" /> },
}

// ─── Helpers ────────────────────────────────────
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth()    === b.getMonth()
      && a.getDate()     === b.getDate()
}

function buildEvents(appointments: Appointment[], blocks: Block[]): CalEvent[] {
  const events: CalEvent[] = []
  for (const a of appointments) {
    if (a.status === 'CANCELLED') continue
    const start = new Date(a.startTime)
    const end   = new Date(a.endTime)
    events.push({
      id: a.id,
      kind: a.status === 'PENDING' ? 'pending' : 'lesson',
      date: start,
      title: a.title,
      time: start.toLocaleTimeString('it', { hour: '2-digit', minute: '2-digit' })
           + ' – ' + end.toLocaleTimeString('it', { hour: '2-digit', minute: '2-digit' }),
      studentName: a.student.name,
      extra: a.location,
    })
  }
  for (const b of blocks) {
    if (!b.dueDate) continue
    events.push({
      id: b.id,
      kind: 'deadline',
      date: new Date(b.dueDate),
      title: b.title,
      time: 'Scadenza',
      studentName: b.student.name,
      extra: `${b.items.length} esercizi`,
    })
  }
  return events
}

// ─── Month grid ─────────────────────────────────
function MonthGrid({ year, month, events, selected, onSelect }: {
  year: number; month: number; events: CalEvent[]
  selected: Date; onSelect: (d: Date) => void
}) {
  const today = new Date()
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const dayMap = useMemo(() => {
    const m = new Map<number, Set<CalEvent['kind']>>()
    for (const e of events) {
      if (e.date.getFullYear() === year && e.date.getMonth() === month) {
        const d = e.date.getDate()
        if (!m.has(d)) m.set(d, new Set())
        m.get(d)!.add(e.kind)
      }
    }
    return m
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, year, month])

  const cells = [...Array(startOffset).fill(0), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-muted-foreground py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />
          const d    = new Date(year, month, day)
          const isSel   = sameDay(d, selected)
          const isToday = sameDay(d, today)
          const kinds   = dayMap.get(day)
          return (
            <button key={`day-${day}`} onClick={() => onSelect(d)}
              className={cn(
                'flex flex-col items-center py-1 rounded-lg text-[11px] font-medium transition-all',
                isSel   ? 'bg-coral-500 text-white shadow-sm'
                : isToday ? 'bg-cream-200 text-navy-900 font-bold'
                : 'text-navy-700 hover:bg-cream-100',
              )}
            >
              {day}
              {kinds && (
                <div className="flex gap-px mt-px">
                  {[...kinds].slice(0, 3).map(k => (
                    <span key={k} className={cn('w-1 h-1 rounded-full', isSel ? 'bg-white/70' : KIND[k].dot)} />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── New lesson sheet ────────────────────────────
function NewLessonSheet({ open, onOpenChange, students, date }: {
  open: boolean; onOpenChange: (v: boolean) => void
  students: Student[]; date: Date
}) {
  const queryClient = useQueryClient()
  const p = (n: number) => String(n).padStart(2, '0')
  const ds = `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}`
  const [form, setForm] = useState({
    studentId: '', title: 'Lezione di lingua',
    startTime: `${ds}T09:00`, endTime: `${ds}T10:00`,
    location: '', description: '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.studentId) return toast.error('Seleziona uno studente')
    setSaving(true)
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: form.studentId, title: form.title,
          startTime: new Date(form.startTime).toISOString(),
          endTime:   new Date(form.endTime).toISOString(),
          location: form.location || null,
          description: form.description || null,
          status: 'CONFIRMED',
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Lezione aggiunta!')
      queryClient.invalidateQueries({ queryKey: ['dash-appointments'] })
      onOpenChange(false)
    } catch {
      toast.error('Errore nel salvataggio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-md">
        <SheetHeader className="mb-5">
          <SheetTitle className="font-display text-xl text-navy-700">Aggiungi lezione</SheetTitle>
        </SheetHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Studente <span className="text-red-400">*</span></Label>
            <Select value={form.studentId ?? ''} onValueChange={v => v && set('studentId', v)}>
              <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
              <SelectContent>
                {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Titolo</Label>
            <Input value={form.title} onChange={e => set('title', e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Inizio</Label>
              <Input type="datetime-local" value={form.startTime} onChange={e => set('startTime', e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Fine</Label>
              <Input type="datetime-local" value={form.endTime} onChange={e => set('endTime', e.target.value)} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Luogo <span className="text-muted-foreground text-xs">(opz.)</span></Label>
            <Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="Online, Studio..." />
          </div>
          <div className="space-y-1.5">
            <Label>Note <span className="text-muted-foreground text-xs">(opz.)</span></Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} className="resize-none text-sm" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Annulla</Button>
            <Button type="submit" disabled={saving} className="flex-1 bg-coral-500 hover:bg-coral-600 text-white gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Aggiungi
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ─── Main export ─────────────────────────────────
export function DashboardCalendar() {
  const queryClient = useQueryClient()
  const today = new Date()
  const [year,     setYear]     = useState(today.getFullYear())
  const [month,    setMonth]    = useState(today.getMonth())
  const [selected, setSelected] = useState(today)
  const [sheet,    setSheet]    = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ['dash-appointments'],
    queryFn: () => fetch('/api/appointments').then(r => r.json()),
  })
  const { data: blocks = [] } = useQuery<Block[]>({
    queryKey: ['dash-blocks'],
    queryFn: () => fetch('/api/blocks').then(r => r.json()),
  })
  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: () => fetch('/api/students').then(r => r.json()),
  })

  const allEvents = useMemo(() => buildEvents(appointments, blocks), [appointments, blocks])
  const pending   = useMemo(() => allEvents.filter(e => e.kind === 'pending'), [allEvents])
  const dayEvents = useMemo(
    () => allEvents.filter(e => sameDay(e.date, selected)).sort((a, b) => a.date.getTime() - b.date.getTime()),
    [allEvents, selected],
  )

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
  }

  async function confirmAppt(id: string, status: 'CONFIRMED' | 'CANCELLED') {
    setLoadingId(id)
    try {
      await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      queryClient.invalidateQueries({ queryKey: ['dash-appointments'] })
      toast.success(status === 'CONFIRMED' ? 'Lezione confermata!' : 'Richiesta rifiutata')
    } catch { toast.error('Errore') }
    finally { setLoadingId(null) }
  }

  async function deleteAppt(id: string) {
    if (!confirm('Eliminare questa lezione?')) return
    await fetch(`/api/appointments/${id}`, { method: 'DELETE' })
    queryClient.invalidateQueries({ queryKey: ['dash-appointments'] })
    toast.success('Lezione eliminata')
  }

  const selLabel = sameDay(selected, today)
    ? 'Oggi'
    : selected.toLocaleDateString('it', { day: 'numeric', month: 'short' })

  return (
    <div className="bg-white rounded-2xl border border-cream-200 shadow-[var(--shadow-card)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cream-100">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            <span className="w-2 h-2 rounded-full bg-coral-500" />
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="w-2 h-2 rounded-full bg-edu-blue-500" />
          </div>
          <span className="font-semibold text-navy-700 text-sm">Calendario</span>
          {pending.length > 0 && (
            <span className="bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {pending.length}
            </span>
          )}
        </div>
        <button onClick={() => setSheet(true)}
          className="flex items-center gap-1 text-xs text-coral-500 hover:text-coral-600 font-medium transition-colors">
          <Plus className="w-3.5 h-3.5" /> Lezione
        </button>
      </div>

      {/* Pending banner */}
      {pending.length > 0 && (
        <div className="mx-4 mt-3 flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            {pending.length} richiesta{pending.length > 1 ? 'e' : ''} da confermare
          </p>
        </div>
      )}

      {/* Month nav */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-cream-100 text-navy-700 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-semibold text-navy-700">{MONTHS[month]} {year}</span>
        <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-cream-100 text-navy-700 transition-colors">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Grid */}
      <div className="px-3 pb-3">
        <MonthGrid
          year={year} month={month} events={allEvents} selected={selected}
          onSelect={d => { setSelected(d); setYear(d.getFullYear()); setMonth(d.getMonth()) }}
        />
      </div>

      {/* Day events */}
      <div className="border-t border-cream-100">
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-xs font-semibold text-navy-700">{selLabel}</span>
          <span className="text-[10px] text-muted-foreground">{dayEvents.length} eventi</span>
        </div>

        {dayEvents.length === 0 ? (
          <div className="px-4 pb-4 text-center">
            <p className="text-xs text-muted-foreground">Nessun evento</p>
            <button onClick={() => setSheet(true)}
              className="mt-1.5 text-xs text-coral-500 hover:text-coral-600 font-medium transition-colors">
              + Aggiungi lezione
            </button>
          </div>
        ) : (
          <div className="divide-y divide-cream-100 max-h-56 overflow-y-auto">
            {dayEvents.map(ev => {
              const cfg = KIND[ev.kind]
              const isAppt = ev.kind === 'lesson' || ev.kind === 'pending'
              return (
                <div key={ev.id} className="px-4 py-2.5 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', cfg.pill)}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-navy-700 truncate">{ev.title}</p>
                      <p className="text-[10px] text-muted-foreground">{ev.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-8">
                    <AvatarInitials name={ev.studentName} size="xs" color={ev.kind === 'deadline' ? 'blue' : 'coral'} />
                    <span className="text-[10px] text-navy-700">{ev.studentName}</span>
                    {ev.extra && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 ml-auto">
                        {isAppt ? <MapPin className="w-2.5 h-2.5" /> : null}
                        {ev.extra}
                      </span>
                    )}
                  </div>

                  {/* Pending actions */}
                  {ev.kind === 'pending' && (
                    <div className="flex gap-1.5 pl-8">
                      <button
                        onClick={() => confirmAppt(ev.id, 'CONFIRMED')}
                        disabled={loadingId === ev.id}
                        className="flex items-center gap-1 text-[10px] font-medium bg-emerald-600 text-white px-2 py-1 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {loadingId === ev.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Check className="w-2.5 h-2.5" />}
                        Conferma
                      </button>
                      <button
                        onClick={() => confirmAppt(ev.id, 'CANCELLED')}
                        disabled={loadingId === ev.id}
                        className="flex items-center gap-1 text-[10px] font-medium border border-red-200 text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <X className="w-2.5 h-2.5" /> Rifiuta
                      </button>
                    </div>
                  )}
                  {ev.kind === 'lesson' && (
                    <button onClick={() => deleteAppt(ev.id)}
                      className="pl-8 text-[10px] text-muted-foreground hover:text-destructive transition-colors">
                      Elimina
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-2.5 border-t border-cream-100 flex items-center gap-3">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-coral-500" /> Lezione
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Richiesta
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-edu-blue-500" /> Scadenza
        </div>
      </div>

      <NewLessonSheet
        open={sheet} onOpenChange={setSheet}
        students={students} date={selected}
      />
    </div>
  )
}
