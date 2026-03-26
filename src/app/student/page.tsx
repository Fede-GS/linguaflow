'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { Clock, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Layers, Calendar, ArrowRight, CalendarPlus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { CefrBadge } from '@/components/students/CefrBadge'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { AppointmentRequestModal } from './AppointmentRequestModal'

type BlockItem = {
  id: string; order: number; topicLabel?: string; status: string
  exercise: {
    id: string; title: string; type: string; cefrLevel: string
    skillFocus: string; estimatedMinutes: number; topic?: string
  }
}

type Block = {
  id: string; title: string; topics: string[]; comments?: string; dueDate?: string
  status: string; createdAt: string
  items: BlockItem[]
}

type Student = {
  id: string; name: string; currentLevel: string; targetLevel: string
  targetLanguage: string; error?: string
}

type Appointment = {
  id: string; title: string; startTime: string; endTime: string; status: string; description?: string; location?: string
}

const ITEM_STATUS_LABELS: Record<string, string> = {
  ASSIGNED: 'Da fare',
  IN_PROGRESS: 'In corso',
  SUBMITTED: 'Consegnato',
  GRADED: 'Corretto',
  RETURNED: 'Restituito',
}

const APPT_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'In attesa', cls: 'bg-amber-50 text-amber-700' },
  CONFIRMED: { label: 'Confermato', cls: 'bg-green-50 text-green-700' },
  CANCELLED: { label: 'Annullato', cls: 'bg-red-50 text-red-700' },
  CHANGE_REQUESTED: { label: 'Modifica richiesta', cls: 'bg-blue-50 text-blue-700' },
}

function BlockCard({ block }: { block: Block }) {
  const [expanded, setExpanded] = useState(true)

  const done = block.items.filter(i => ['SUBMITTED', 'GRADED', 'RETURNED'].includes(i.status)).length
  const total = block.items.length
  const totalMinutes = block.items.reduce((acc, i) => acc + (i.exercise.estimatedMinutes ?? 0), 0)
  const isCompleted = ['COMPLETED', 'GRADED'].includes(block.status)
  const isInProgress = block.status === 'IN_PROGRESS'

  return (
    <div className={cn(
      'rounded-2xl border-2 overflow-hidden transition-all',
      isCompleted ? 'border-green-200 bg-green-50/30' :
      isInProgress ? 'border-amber-200 bg-amber-50/20' :
      'border-cream-200 bg-white'
    )}>
      <div className="p-5">
        {block.topics.length > 0 && (
          <div className="mb-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 mb-1.5">📚 Argomenti trattati:</p>
            <div className="flex flex-wrap gap-1.5">
              {block.topics.map(t => (
                <span key={t} className="text-xs bg-white text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full font-medium">{t}</span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-navy-700 text-lg leading-tight">{block.title}</h3>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span>{total} esercizi · {totalMinutes} min totali</span>
              {block.dueDate && (
                <span className="flex items-center gap-1 text-amber-600">
                  <Calendar className="w-3.5 h-3.5" /> Scadenza: {formatDate(block.dueDate)}
                </span>
              )}
            </div>
            {total > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{done} di {total} completati</span>
                  <span>{Math.round((done / total) * 100)}%</span>
                </div>
                <div className="h-2 bg-cream-200 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', isCompleted ? 'bg-green-500' : 'bg-coral-500')}
                    style={{ width: `${(done / total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isCompleted && <CheckCircle className="w-5 h-5 text-green-500" />}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 rounded-lg hover:bg-cream-100 text-muted-foreground hover:text-navy-700 transition-colors"
            >
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {block.comments && (
          <p className="mt-3 text-sm text-navy-700 bg-cream-50 rounded-lg px-3 py-2 border border-cream-200">
            💬 {block.comments}
          </p>
        )}
      </div>

      {expanded && (
        <div className="border-t border-cream-200 divide-y divide-cream-100">
          {block.items.map((item, idx) => {
            const isDone = ['SUBMITTED', 'GRADED', 'RETURNED'].includes(item.status)
            const isActive = ['ASSIGNED', 'IN_PROGRESS'].includes(item.status)

            return (
              <div key={item.id} className={cn('px-5 py-4', isDone && 'opacity-70')}>
                {item.topicLabel && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <ArrowRight className="w-3.5 h-3.5 text-coral-500 flex-shrink-0" />
                    <p className="text-xs font-medium text-coral-700 bg-coral-50 px-2 py-0.5 rounded-full">
                      {item.topicLabel}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                    isDone ? 'bg-green-100 text-green-600' : 'bg-cream-200 text-navy-700'
                  )}>
                    {isDone ? '✓' : idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-navy-700 text-sm">{item.exercise.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.exercise.estimatedMinutes} min</p>
                  </div>
                  <div className="flex-shrink-0">
                    {isActive ? (
                      <Link href={`/student/exercise/${item.id}?blockId=${block.id}`}>
                        <Button size="sm" className="bg-coral-500 hover:bg-coral-600 text-white gap-1">
                          {item.status === 'IN_PROGRESS' ? 'Riprendi' : 'Inizia'}
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    ) : (
                      <Badge variant="outline" className={cn('text-xs border-0',
                        item.status === 'RETURNED' ? 'bg-green-100 text-green-700' :
                        item.status === 'SUBMITTED' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      )}>
                        {ITEM_STATUS_LABELS[item.status] ?? item.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function StudentPage() {
  const [apptModal, setApptModal] = useState(false)

  const { data: student, isLoading: studentLoading } = useQuery<Student>({
    queryKey: ['student-me'],
    queryFn: () => fetch('/api/student/auth/me').then(r => r.json()),
  })

  const { data: blocks = [], isLoading: blocksLoading } = useQuery<Block[]>({
    queryKey: ['student-blocks'],
    queryFn: () => fetch('/api/student-blocks').then(r => r.json()),
    enabled: !!student && !('error' in student),
  })

  const { data: appointments = [] } = useQuery<Appointment[]>({
    queryKey: ['student-appointments'],
    queryFn: () => fetch('/api/student/appointments').then(r => r.json()),
    enabled: !!student && !('error' in student),
  })

  if (studentLoading || blocksLoading) return (
    <div className="space-y-4">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>
  )

  if (!student || 'error' in student) return (
    <div className="text-center py-20">
      <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground">Sessione scaduta. <a href="/student/login" className="text-coral-500 underline">Accedi di nuovo</a></p>
    </div>
  )

  const pendingBlocks = blocks.filter(b => ['ASSIGNED', 'IN_PROGRESS'].includes(b.status))
  const doneBlocks = blocks.filter(b => ['COMPLETED', 'GRADED'].includes(b.status))
  const upcomingAppts = appointments.filter(a => a.status === 'CONFIRMED' && new Date(a.startTime) > new Date()).slice(0, 3)
  const pendingAppts = appointments.filter(a => a.status === 'PENDING')

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-700">Ciao, {student.name.split(' ')[0]}!</h1>
          <div className="flex items-center gap-2 mt-1">
            <CefrBadge level={student.currentLevel} />
            <span className="text-sm text-muted-foreground">→ Obiettivo</span>
            <CefrBadge level={student.targetLevel} />
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setApptModal(true)} className="gap-1.5">
          <CalendarPlus className="w-3.5 h-3.5" /> Prenota lezione
        </Button>
      </div>

      {blocks.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 border border-cream-200 text-center">
            <div className="text-2xl font-bold text-navy-700">{blocks.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Blocchi totali</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 text-center">
            <div className="text-2xl font-bold text-amber-600">{pendingBlocks.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Da completare</div>
          </div>
          <div className="bg-green-50 rounded-xl p-3 border border-green-100 text-center">
            <div className="text-2xl font-bold text-green-600">{doneBlocks.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Completati</div>
          </div>
        </div>
      )}

      {/* Upcoming appointments */}
      {(upcomingAppts.length > 0 || pendingAppts.length > 0) && (
        <div className="bg-white rounded-2xl border border-cream-200 p-4">
          <h2 className="font-semibold text-navy-700 mb-3 flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-coral-500" /> Lezioni
          </h2>
          <div className="space-y-2">
            {[...upcomingAppts, ...pendingAppts].map(a => {
              const cfg = APPT_STATUS[a.status] ?? { label: a.status, cls: 'bg-gray-50 text-gray-600' }
              return (
                <div key={a.id} className="flex items-center gap-3 py-2 border-b border-cream-100 last:border-0">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-navy-700">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(a.startTime)}
                      {a.location && ` · ${a.location}`}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-xs border-0 ${cfg.cls}`}>{cfg.label}</Badge>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {pendingBlocks.length > 0 && (
        <div>
          <h2 className="font-semibold text-navy-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" /> Da completare ({pendingBlocks.length})
          </h2>
          <div className="space-y-4">
            {pendingBlocks.map(b => <BlockCard key={b.id} block={b} />)}
          </div>
        </div>
      )}

      {doneBlocks.length > 0 && (
        <div>
          <h2 className="font-semibold text-navy-700 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" /> Completati ({doneBlocks.length})
          </h2>
          <div className="space-y-4">
            {doneBlocks.map(b => <BlockCard key={b.id} block={b} />)}
          </div>
        </div>
      )}

      {blocks.length === 0 && (
        <div className="text-center py-16">
          <Layers className="w-12 h-12 text-cream-200 mx-auto mb-3" />
          <p className="text-muted-foreground">Nessun blocco di esercizi assegnato ancora.</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Il tuo insegnante ti assegnerà presto dei blocchi!</p>
        </div>
      )}

      {apptModal && (
        <AppointmentRequestModal onClose={() => setApptModal(false)} />
      )}
    </div>
  )
}
