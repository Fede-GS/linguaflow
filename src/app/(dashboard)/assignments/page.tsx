'use client'

import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ClipboardCheck, Clock, CheckCircle, Layers, ChevronDown, ChevronUp, Calendar, Star, Loader2, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CefrBadge } from '@/components/students/CefrBadge'
import { PageHeader, EmptyState, AvatarInitials, ProgressBar, TabBar, SkeletonCard } from '@/components/ui/lf-components'
import { ASSIGNMENT_STATUS_LABELS, EXERCISE_TYPE_LABELS, formatDate, formatRelative, cn } from '@/lib/utils'
import { useState } from 'react'
import { toast } from 'sonner'

type BlockItem = {
  id: string; order: number; status: string; submittedAt?: string; teacherScore?: number
  exercise: { id: string; title: string; type: string; cefrLevel: string; skillFocus: string; estimatedMinutes: number }
}

type Block = {
  id: string; title: string; topics: string[]; comments?: string; dueDate?: string
  status: string; createdAt: string; updatedAt: string
  student: { id: string; name: string; currentLevel: string }
  items: BlockItem[]
}

const BLOCK_STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  ASSIGNED: { label: 'Assegnato', cls: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Layers className="w-3.5 h-3.5" /> },
  IN_PROGRESS: { label: 'In corso', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Clock className="w-3.5 h-3.5" /> },
  COMPLETED: { label: 'Completato', cls: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  GRADED: { label: 'Corretto', cls: 'bg-purple-50 text-purple-700 border-purple-200', icon: <Star className="w-3.5 h-3.5" /> },
}

function BlockCard({ block, index }: { block: Block; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const queryClient = useQueryClient()
  const cfg = BLOCK_STATUS_CONFIG[block.status] ?? { label: block.status, cls: 'bg-gray-50 text-gray-600 border-gray-200', icon: null }
  const totalMinutes = block.items.reduce((acc, i) => acc + (i.exercise.estimatedMinutes ?? 0), 0)
  const submittedItems = block.items.filter(i => ['SUBMITTED', 'GRADED', 'RETURNED'].includes(i.status))
  const toGrade = block.items.filter(i => i.status === 'SUBMITTED')

  const gradeMutation = useMutation({
    mutationFn: (blockId: string) => fetch(`/api/blocks/${blockId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'GRADED' }),
    }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['blocks'] }); toast.success('Blocco marcato come corretto') },
  })

  const borderColor = {
    COMPLETED:   'border-green-100',
    IN_PROGRESS: 'border-amber-100',
    GRADED:      'border-violet-100',
    ASSIGNED:    'border-cream-200',
  }[block.status] ?? 'border-cream-200'

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, ease: [0.4,0,0.2,1] }}>
      <div className={cn(
        'bg-white rounded-2xl border overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow duration-200',
        borderColor,
      )}>
        <div className="p-5">
          <div className="flex items-start gap-3">
            <AvatarInitials name={block.student.name} size="md" color="blue" />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-navy-700 truncate">{block.student.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{block.title}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <CefrBadge level={block.student.currentLevel} />
                  <span className={cn('text-xs flex items-center gap-1 px-2 py-0.5 rounded-lg font-medium', cfg.cls)}>
                    {cfg.icon} {cfg.label}
                  </span>
                </div>
              </div>

              {block.topics.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {block.topics.map(t => (
                    <span key={t} className="text-xs bg-edu-blue-500/8 text-edu-blue-600 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                <span className="tabular-nums">{block.items.length} esercizi · {totalMinutes} min</span>
                <span className="tabular-nums">{submittedItems.length}/{block.items.length} completati</span>
                {block.dueDate && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <Calendar className="w-3 h-3" /> {formatDate(block.dueDate)}
                  </span>
                )}
                <span className="ml-auto">{formatRelative(block.updatedAt)}</span>
              </div>

              {/* Progress bar */}
              <ProgressBar
                value={submittedItems.length}
                max={block.items.length || 1}
                color={block.status === 'IN_PROGRESS' ? 'amber' : block.status === 'GRADED' ? 'blue' : 'green'}
                size="xs"
                className="mt-2"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-cream-100">
            {toGrade.length > 0 && (
              <Button
                size="sm"
                onClick={() => gradeMutation.mutate(block.id)}
                disabled={gradeMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5 text-xs h-7 rounded-lg"
              >
                {gradeMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
                Marca come corretto ({toGrade.length})
              </Button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="ml-auto text-xs text-muted-foreground hover:text-navy-700 flex items-center gap-1 transition-colors"
            >
              {expanded
                ? <><ChevronUp className="w-3.5 h-3.5" /> Chiudi</>
                : <><ChevronDown className="w-3.5 h-3.5" /> {block.items.length} esercizi</>}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-cream-100 divide-y divide-cream-100">
            {block.items.map((item, idx) => (
              <div key={item.id} className="px-5 py-3 flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-cream-100 text-navy-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-navy-700 font-medium truncate">{item.exercise.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {EXERCISE_TYPE_LABELS[item.exercise.type]} · {item.exercise.estimatedMinutes} min
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.teacherScore !== undefined && item.teacherScore !== null && (
                    <span className="text-sm font-bold text-coral-500 tabular-nums">{item.teacherScore}/100</span>
                  )}
                  <span className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-md',
                    item.status === 'RETURNED'    ? 'bg-green-50 text-green-700'   :
                    item.status === 'SUBMITTED'   ? 'bg-amber-50 text-amber-700'   :
                    item.status === 'GRADED'      ? 'bg-violet-50 text-violet-700' :
                    item.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700'     :
                    'bg-gray-50 text-gray-600'
                  )}>
                    {ASSIGNMENT_STATUS_LABELS[item.status] ?? item.status}
                  </span>
                  {(item.status === 'SUBMITTED' || item.status === 'RETURNED' || item.status === 'GRADED') && (
                    <Link href={`/blocks/item/${item.id}/correct`}>
                      <button className="p-1 rounded-lg hover:bg-cream-100 text-muted-foreground hover:text-coral-500 transition-colors" title="Correggi">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function AssignmentsPage() {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active')

  const { data: blocks = [], isLoading } = useQuery<Block[]>({
    queryKey: ['blocks'],
    queryFn: () => fetch('/api/blocks').then(r => r.json()),
  })

  const completedBlocks = blocks.filter(b => ['COMPLETED', 'GRADED'].includes(b.status))
  const activeBlocks    = blocks.filter(b => ['ASSIGNED', 'IN_PROGRESS'].includes(b.status))
  const toGradeCount    = blocks.filter(b => b.status === 'COMPLETED').length

  const displayed = activeTab === 'active' ? activeBlocks : completedBlocks

  return (
    <div className="space-y-6">
      <PageHeader
        title="Esercizi assegnati"
        subtitle={`${activeBlocks.length} attivi${toGradeCount > 0 ? ` · ${toGradeCount} da correggere` : ''} · ${completedBlocks.length} completati`}
      />

      <TabBar
        tabs={[
          { value: 'active',    label: 'Attivi',      count: activeBlocks.length },
          { value: 'completed', label: 'Completati',  count: completedBlocks.length },
        ]}
        active={activeTab}
        onChange={(v) => setActiveTab(v as 'active' | 'completed')}
      />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-white rounded-2xl border border-cream-200 shadow-[var(--shadow-card)]">
          <EmptyState
            icon={<ClipboardCheck className="w-8 h-8" />}
            title={activeTab === 'active' ? 'Nessun blocco attivo' : 'Nessun blocco completato'}
            description={
              activeTab === 'active'
                ? 'Crea e assegna blocchi agli studenti dalla pagina "Crea esercizi"'
                : 'I blocchi completati appariranno qui'
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map((block, i) => (
            <BlockCard key={block.id} block={block} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
