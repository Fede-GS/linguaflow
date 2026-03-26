'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { GraduationCap, Sparkles, Trash2, Search, Filter, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CefrBadge } from '@/components/students/CefrBadge'
import { PageHeader, EmptyState, SkeletonCard, SectionCard } from '@/components/ui/lf-components'
import { EXERCISE_TYPE_LABELS, SKILL_FOCUS_LABELS, formatRelative, CEFR_LEVELS } from '@/lib/utils'

const ALL = '__all__'

export default function ExercisesPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState(ALL)
  const [levelFilter, setLevelFilter] = useState(ALL)
  const [skillFilter, setSkillFilter] = useState(ALL)

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => fetch('/api/exercises').then(r => r.json()),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/exercises/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['exercises'] }); toast.success('Esercizio eliminato') },
  })

  const filtered = useMemo(() => {
    return exercises.filter((ex: { title: string; type: string; cefrLevel: string; skillFocus: string; topic?: string }) => {
      if (typeFilter !== ALL && ex.type !== typeFilter) return false
      if (levelFilter !== ALL && ex.cefrLevel !== levelFilter) return false
      if (skillFilter !== ALL && ex.skillFocus !== skillFilter) return false
      if (search) {
        const s = search.toLowerCase()
        return ex.title.toLowerCase().includes(s) || (ex.topic ?? '').toLowerCase().includes(s)
      }
      return true
    })
  }, [exercises, typeFilter, levelFilter, skillFilter, search])

  const hasFilters = typeFilter !== ALL || levelFilter !== ALL || skillFilter !== ALL || search

  function clearFilters() {
    setSearch('')
    setTypeFilter(ALL)
    setLevelFilter(ALL)
    setSkillFilter(ALL)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Libreria esercizi"
        subtitle={`${filtered.length} di ${exercises.length} esercizi`}
        actions={
          <Link href="/exercises/new">
            <Button className="bg-coral-500 hover:bg-coral-600 text-white gap-2 h-9 px-4 rounded-xl shadow-sm">
              <Sparkles className="w-4 h-4" /> Genera con AI
            </Button>
          </Link>
        }
      />

      {/* ── Filters ─────────────────────────────────── */}
      <SectionCard noPadding>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-sm font-medium text-navy-700">Filtra</span>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto text-xs text-muted-foreground hover:text-coral-500 flex items-center gap-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Rimuovi filtri
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cerca per titolo o argomento..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 text-sm h-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? ALL)}>
              <SelectTrigger className="text-sm h-9">
                <SelectValue placeholder="Tipo esercizio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tutti i tipi</SelectItem>
                {Object.entries(EXERCISE_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v ?? ALL)}>
              <SelectTrigger className="text-sm h-9">
                <SelectValue placeholder="Livello CEFR" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tutti i livelli</SelectItem>
                {CEFR_LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={skillFilter} onValueChange={(v) => setSkillFilter(v ?? ALL)}>
              <SelectTrigger className="text-sm h-9">
                <SelectValue placeholder="Competenza" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tutte le competenze</SelectItem>
                {Object.entries(SKILL_FOCUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      {/* ── Grid ────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-cream-200 shadow-[var(--shadow-card)]">
          <EmptyState
            icon={<GraduationCap className="w-8 h-8" />}
            title={hasFilters ? 'Nessun esercizio trovato' : 'Nessun esercizio ancora'}
            description={hasFilters ? 'Prova a modificare i filtri' : "Usa l'AI per generare il tuo primo esercizio"}
            action={!hasFilters ? (
              <Link href="/exercises/new">
                <Button className="bg-coral-500 hover:bg-coral-600 text-white gap-2 h-9 px-4 rounded-xl">
                  <Sparkles className="w-4 h-4" /> Genera con AI
                </Button>
              </Link>
            ) : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ex: {
            id: string; title: string; type: string; cefrLevel: string;
            skillFocus: string; topic?: string; estimatedMinutes: number;
            aiGenerated: boolean; createdAt: string; _count?: { assignments: number }
          }, i: number) => (
            <motion.div key={ex.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, ease: [0.4,0,0.2,1] }}>
              <div className="bg-white rounded-2xl p-5 border border-cream-200 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-px transition-all duration-200 h-full flex flex-col group">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <Link href={`/exercises/${ex.id}`}>
                      <h3 className="font-semibold text-navy-700 hover:text-coral-500 transition-colors line-clamp-2 text-sm leading-snug">{ex.title}</h3>
                    </Link>
                  </div>
                  <button
                    onClick={() => { if (confirm('Eliminare questo esercizio?')) deleteMutation.mutate(ex.id) }}
                    className="text-muted-foreground/40 hover:text-destructive transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 -m-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  <CefrBadge level={ex.cefrLevel} />
                  <span className="text-[11px] bg-cream-100 text-muted-foreground px-2 py-0.5 rounded-md">
                    {EXERCISE_TYPE_LABELS[ex.type] ?? ex.type}
                  </span>
                  <span className="text-[11px] bg-cream-100 text-muted-foreground px-2 py-0.5 rounded-md">
                    {SKILL_FOCUS_LABELS[ex.skillFocus] ?? ex.skillFocus}
                  </span>
                </div>

                {ex.topic && (
                  <p className="text-xs text-muted-foreground mb-2 truncate">{ex.topic}</p>
                )}

                <div className="mt-auto pt-2 border-t border-cream-100 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground tabular-nums">{ex.estimatedMinutes} min · {formatRelative(ex.createdAt)}</span>
                  {ex.aiGenerated && (
                    <span className="text-[10px] font-bold text-coral-500 bg-coral-50 border border-coral-100 px-1.5 py-0.5 rounded-md">
                      AI
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
