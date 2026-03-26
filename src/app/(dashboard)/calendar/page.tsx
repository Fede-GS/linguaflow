'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight, Plus, Check, X, Clock,
  MapPin, BookOpen, Loader2, AlertCircle, CalendarDays,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { PageHeader, AvatarInitials } from '@/components/ui/lf-components'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────
type Student = { id: string; name: string }

type Appointment = {
  id: string; title: string; description?: string; location?: string
  startTime: string; endTime: string; status: string; proposedBy: string
  student: { id: string; name: string }
}

type Block = {
  id: string; title: string; dueDate?: string; status: string; topics: string[]
  student: { id: string; name: string }
  items: { id: string }[]
}

// A unified calendar event (either a lesson or a deadline)
type CalEvent = {
  id: string
  kind: 'lesson' | 'deadline' | 'pending'
  date: Date
  title: string
  subtitle: string
  studentName: string
  studentId: string
  raw: Appointment | Block
}

// ─── Constants ───────────────────────────────────
const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const MONTHS = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
]

const KIND_CONFIG = {
  lesson:   { dot: 'bg-coral-500',    badge: 'bg-coral-50 text-coral-700 border-coral-200',   label: 'Lezione' },
  deadline: { dot: 'bg-edu-blue-500', badge: 'bg-edu-blue-50 text-edu-blue-700 border-edu-blue-200', label: 'Scadenza' },
  pending:  { dot: 'bg-amber-400',    badge: 'bg-amber-50 text-amber-700 border-amber-200',   label: 'Richiesta' },
}

// ─── Helpers ─────────────────────────────────────
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth()    === b.getMonth()
      && a.getDate()     === b.getDate()
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString('it', { hour: '2-digit', minute: '2-digit' })
}

function fmtDateLong(d: Date) {
  return d.toLocaleDateString('it', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtMonthShort(d: Date) {
  return d.toLocaleDateString('it', { month: 'short' })
}

// ─── Build unified event list from raw data ───────
function buildEvents(appointments: Appointment[], blocks: Block[]): CalEvent[] {
  const events: CalEvent[] = []

  for (const a of appointments) {
    if (a.status === 'CANCELLED') continue
    events.push({
      id: a.id,
      kind: a.status === 'PENDING' ? 'pending' : 'lesson',
      date: new Date(a.startTime),
      title: a.title,
      subtitle: fmtTime(new Date(a.startTime)) + ' – ' + fmtTime(new Date(a.endTime)),
      studentName: a.student.name,
      studentId: a.student.id,
      raw: a,
    })
  }

  for (const b of blocks) {
    if (!b.dueDate) continue
    events.push({
      id: b.id,
      kind: 'deadline',
      date: new Date(b.dueDate),
      title: b.title,
      subtitle: `${b.items.length} esercizi · Scadenza`,
      studentName: b.student.name,
      studentId: b.student.id,
      raw: b,
    })
  }

  return events
}

// ─── Month grid ──────────────────────────────────
function MonthGrid({
  year, month, events, selected, onSelect,
}: {
  year: number; month: number
  events: CalEvent[]; selected: Date; onSelect: (d: Date) => void
}) {
  const today = new Date()
  const firstDay = new Date(year, month, 1)
  const startOffset = (firstDay.getDay() + 6) % 7 // Mon = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Build a map: "YYYY-M-D" → kinds[]
  const dayKinds = useMemo(() => {
    const map = new Map<string, Set<CalEvent['kind']>>()
    for (const e of events) {
      const d = e.date
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = `${d.getDate()}`
        if (!map.has(key)) map.set(key, new Set())
        map.get(key)!.add(e.kind)
      }
    }
    return map
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, year, month])

  const cells = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS_SHORT.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
        ))}
      </div>
      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const thisDate = new Date(year, month, day)
          const isToday = sameDay(thisDate, today)
          const isSel   = sameDay(thisDate, selected)
          const kinds   = dayKinds.get(`${day}`)

          return (
            <button
              key={`day-${day}`}
              onClick={() => onSelect(thisDate)}
              className={cn(
                'relative flex flex-col items-center pb-1.5 pt-1 rounded-lg text-xs font-medium transition-all group',
                isSel   ? 'bg-coral-500 text-white shadow-sm'
                : isToday ? 'bg-cream-200 text-navy-900 font-bold'
                : 'text-navy-700 hover:bg-cream-100',
              )}
            >
              <span>{day}</span>
              {/* Event dots */}
              {kinds && kinds.size > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {[...kinds].slice(0, 3).map(k => (
                    <span
                      key={k}
                      className={cn('w-1 h-1 rounded-full', isSel ? 'bg-white/70' : KIND_CONFIG[k].dot)}
                    />
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

// ─── Event card ──────────────────────────────────
function EventCard({
  event, onConfirm, onReject, onDelete, loadingId,
}: {
  event: CalEvent
  onConfirm: (id: string) => void
  onReject:  (id: string) => void
  onDelete:  (id: string) => void
  loadingId: string | null
}) {
  const cfg = KIND_CONFIG[event.kind]
  const isLesson   = event.kind === 'lesson' || event.kind === 'pending'
  const isPending  = event.kind === 'pending'
  const appt       = isLesson ? (event.raw as Appointment) : null

  return (
    <div className={cn(
      'bg-white rounded-xl border p-4 shadow-[var(--shadow-card)] space-y-3',
      isPending ? 'border-amber-200' : 'border-cream-200',
    )}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
          event.kind === 'lesson'   ? 'bg-coral-50'     :
          event.kind === 'pending'  ? 'bg-amber-50'     :
          'bg-edu-blue-50',
        )}>
          {isLesson
            ? <Clock className={cn('w-4 h-4', isPending ? 'text-amber-500' : 'text-coral-500')} />
            : <BookOpen className="w-4 h-4 text-edu-blue-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-navy-700 text-sm leading-tight">{event.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{event.subtitle}</p>
        </div>
        <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0', cfg.badge)}>
          {cfg.label}{isPending ? ' · studente' : ''}
        </span>
      </div>

      {/* Student */}
      <div className="flex items-center gap-2">
        <AvatarInitials name={event.studentName} size="xs" color={event.kind === 'deadline' ? 'blue' : 'coral'} />
        <span className="text-xs text-navy-700 font-medium">{event.studentName}</span>
      </div>

      {/* Location / description */}
      {appt?.location && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <MapPin className="w-3 h-3" /> {appt.location}
        </p>
      )}
      {appt?.description && (
        <p className="text-xs text-muted-foreground bg-cream-50 rounded-lg px-3 py-2 leading-relaxed">
          {appt.description}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-cream-100">
        {isPending && (
          <>
            <Button
              size="sm" onClick={() => onConfirm(event.id)}
              disabled={loadingId === event.id}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-7 text-xs"
            >
              {loadingId === event.id
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Check className="w-3 h-3" />}
              Conferma
            </Button>
            <Button
              size="sm" variant="outline" onClick={() => onReject(event.id)}
              disabled={loadingId === event.id}
              className="flex-1 gap-1.5 h-7 text-xs text-destructive hover:text-destructive"
            >
              <X className="w-3 h-3" /> Rifiuta
            </Button>
          </>
        )}
        {!isPending && (
          <button
            onClick={() => onDelete(event.id)}
            className="ml-auto text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            {isLesson ? 'Elimina lezione' : 'Vai al blocco'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── New lesson sheet ─────────────────────────────
function NewLessonSheet({
  open, onOpenChange, students, selectedDate,
}: {
  open: boolean; onOpenChange: (v: boolean) => void
  students: Student[]; selectedDate: Date
}) {
  const queryClient = useQueryClient()
  const p = (n: number) => String(n).padStart(2, '0')
  const ds = `${selectedDate.getFullYear()}-${p(selectedDate.getMonth()+1)}-${p(selectedDate.getDate())}`

  const [form, setForm] = useState({
    studentId: '', title: 'Lezione di lingua',
    startTime: `${ds}T09:00`, endTime: `${ds}T10:00`,
    location: '', description: '',
  })
  const [saving, setSaving] = useState(false)

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

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
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] })
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

// ─── Main page ────────────────────────────────────
export default function CalendarPage() {
  const queryClient = useQueryClient()
  const today = new Date()

  const [viewYear,  setViewYear]  = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selected,  setSelected]  = useState(today)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  // ── Data fetching ──────────────────────────────
  const { data: appointments = [], isLoading: loadAppt } = useQuery<Appointment[]>({
    queryKey: ['calendar-appointments'],
    queryFn: () => fetch('/api/appointments').then(r => r.json()),
  })

  const { data: blocks = [], isLoading: loadBlocks } = useQuery<Block[]>({
    queryKey: ['calendar-blocks'],
    queryFn: () => fetch('/api/blocks').then(r => r.json()),
  })

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: () => fetch('/api/students').then(r => r.json()),
  })

  const isLoading = loadAppt || loadBlocks

  // ── Unified events ─────────────────────────────
  const allEvents = useMemo(
    () => buildEvents(appointments, blocks),
    [appointments, blocks],
  )

  const pendingRequests = useMemo(
    () => allEvents.filter(e => e.kind === 'pending'),
    [allEvents],
  )

  const selectedEvents = useMemo(
    () => allEvents
      .filter(e => sameDay(e.date, selected))
      .sort((a, b) => a.date.getTime() - b.date.getTime()),
    [allEvents, selected],
  )

  // Upcoming: next 8 events from today (excluding past)
  const upcomingEvents = useMemo(() => {
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return allEvents
      .filter(e => e.date >= todayStart)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 8)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allEvents])

  // ── Month nav ──────────────────────────────────
  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }
  function goToday() {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
    setSelected(today)
  }

  // ── Actions ────────────────────────────────────
  async function patchAppt(id: string, status: string) {
    setLoadingId(id)
    try {
      await fetch(`/api/appointments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] })
      toast.success(status === 'CONFIRMED' ? 'Lezione confermata!' : 'Richiesta rifiutata')
    } catch {
      toast.error('Errore')
    } finally {
      setLoadingId(null)
    }
  }

  async function deleteAppt(id: string) {
    if (!confirm('Eliminare questa lezione?')) return
    await fetch(`/api/appointments/${id}`, { method: 'DELETE' })
    queryClient.invalidateQueries({ queryKey: ['calendar-appointments'] })
    toast.success('Lezione eliminata')
  }

  // Counts
  const lessonCount    = allEvents.filter(e => e.kind === 'lesson').length
  const deadlineCount  = allEvents.filter(e => e.kind === 'deadline').length

  return (
    <div className="space-y-5">
      <PageHeader
        title="Calendario"
        subtitle={`${lessonCount} lezioni · ${deadlineCount} scadenze`}
        actions={
          <Button
            onClick={() => setSheetOpen(true)}
            className="bg-coral-500 hover:bg-coral-600 text-white gap-2 h-9 px-4 rounded-xl shadow-sm"
          >
            <Plus className="w-4 h-4" /> Aggiungi lezione
          </Button>
        }
      />

      {/* Pending banner */}
      {pendingRequests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {pendingRequests.length} richiesta{pendingRequests.length > 1 ? 'e' : ''} in attesa di conferma
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {pendingRequests.map(e => e.studentName).join(', ')} — clicca il giorno nel calendario per confermare o rifiutare
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-5">

        {/* ── Left column ──────────────────────── */}
        <div className="space-y-4">

          {/* Month calendar */}
          <div className="bg-white rounded-2xl border border-cream-200 p-4 shadow-[var(--shadow-card)]">
            {/* Month header */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg hover:bg-cream-100 text-navy-700 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-center">
                <p className="font-semibold text-navy-700 text-sm">{MONTHS[viewMonth]}</p>
                <p className="text-xs text-muted-foreground">{viewYear}</p>
              </div>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg hover:bg-cream-100 text-navy-700 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <MonthGrid
              year={viewYear} month={viewMonth}
              events={allEvents} selected={selected}
              onSelect={d => {
                setSelected(d)
                setViewYear(d.getFullYear())
                setViewMonth(d.getMonth())
              }}
            />

            {/* Today button */}
            {!sameDay(selected, today) && (
              <button
                onClick={goToday}
                className="mt-3 w-full text-xs text-coral-500 hover:text-coral-600 font-medium text-center transition-colors"
              >
                Torna ad oggi
              </button>
            )}
          </div>

          {/* Legend */}
          <div className="bg-white rounded-xl border border-cream-200 p-3 shadow-[var(--shadow-card)]">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Legenda</p>
            <div className="space-y-1.5">
              {(Object.entries(KIND_CONFIG) as [CalEvent['kind'], typeof KIND_CONFIG[keyof typeof KIND_CONFIG]][]).map(([k, cfg]) => (
                <div key={k} className="flex items-center gap-2 text-xs text-navy-700">
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot)} />
                  {cfg.label}
                </div>
              ))}
            </div>
          </div>

          {/* Prossimi eventi — compact list */}
          {upcomingEvents.length > 0 && (
            <div className="bg-white rounded-2xl border border-cream-200 shadow-[var(--shadow-card)] overflow-hidden">
              <div className="px-4 py-3 border-b border-cream-100">
                <p className="text-sm font-semibold text-navy-700">Prossimi eventi</p>
              </div>
              <div className="divide-y divide-cream-100">
                {upcomingEvents.map(event => {
                  const cfg = KIND_CONFIG[event.kind]
                  const isEvtToday = sameDay(event.date, today)
                  return (
                    <button
                      key={event.id}
                      onClick={() => {
                        setSelected(event.date)
                        setViewYear(event.date.getFullYear())
                        setViewMonth(event.date.getMonth())
                      }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-cream-50 transition-colors text-left"
                    >
                      {/* Mini date badge */}
                      <div className={cn(
                        'w-9 h-9 rounded-xl flex-shrink-0 flex flex-col items-center justify-center text-center',
                        isEvtToday ? 'bg-coral-500 text-white' : 'bg-cream-100 text-navy-700',
                      )}>
                        <span className="text-[8px] font-bold uppercase leading-none">
                          {fmtMonthShort(event.date)}
                        </span>
                        <span className="text-sm font-bold leading-tight">{event.date.getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-navy-700 truncate">{event.title}</p>
                        <p className="text-[10px] text-muted-foreground">{event.studentName}</p>
                      </div>
                      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', cfg.dot)} />
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Right column — day detail ─────────── */}
        <div>
          {/* Day header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-bold text-navy-700 text-lg capitalize">
                {sameDay(selected, today) ? 'Oggi' : fmtDateLong(selected)}
              </h2>
              {sameDay(selected, today) && (
                <p className="text-xs text-muted-foreground capitalize">{fmtDateLong(today)}</p>
              )}
            </div>
            <Button
              variant="outline" size="sm"
              onClick={() => setSheetOpen(true)}
              className="gap-1.5 h-8 text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Lezione
            </Button>
          </div>

          {/* Day events */}
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-28 bg-cream-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : selectedEvents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-cream-200 py-14 text-center shadow-[var(--shadow-card)]">
              <CalendarDays className="w-10 h-10 text-cream-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-navy-700">Nessun evento in questo giorno</p>
              <p className="text-xs text-muted-foreground mt-1">Lezioni e scadenze blocchi appariranno qui</p>
              <Button
                variant="ghost" size="sm" onClick={() => setSheetOpen(true)}
                className="mt-3 text-coral-500 gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Aggiungi lezione
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedEvents.map(event => (
                <EventCard
                  key={event.id} event={event} loadingId={loadingId}
                  onConfirm={id => patchAppt(id, 'CONFIRMED')}
                  onReject={id  => patchAppt(id, 'CANCELLED')}
                  onDelete={deleteAppt}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <NewLessonSheet
        open={sheetOpen} onOpenChange={setSheetOpen}
        students={students} selectedDate={selected}
      />
    </div>
  )
}
