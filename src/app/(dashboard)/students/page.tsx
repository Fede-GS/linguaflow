'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Users, Search, Copy, X, KeyRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { CefrBadge } from '@/components/students/CefrBadge'
import { StudentForm, type StudentFormData } from '@/components/students/StudentForm'
import { PageHeader, EmptyState, AvatarInitials, SkeletonCard } from '@/components/ui/lf-components'
import { cn } from '@/lib/utils'

type CreatedStudent = {
  id: string; name: string; email?: string; accessCode?: string
}

export default function StudentsPage() {
  const queryClient = useQueryClient()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [createdStudent, setCreatedStudent] = useState<CreatedStudent | null>(null)

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: () => fetch('/api/students').then(r => r.json()),
  })

  const createMutation = useMutation({
    mutationFn: async (data: StudentFormData) => {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Errore nel salvataggio')
      }
      return res.json()
    },
    onSuccess: (student: CreatedStudent) => {
      queryClient.invalidateQueries({ queryKey: ['students'] })
      setSheetOpen(false)
      setCreatedStudent(student)
    },
    onError: (err: Error) => toast.error(err.message || 'Errore nel salvataggio'),
  })

  const filtered = students.filter((s: { name: string; goal?: string }) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.goal?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Studenti"
        subtitle={`${students.length} studente${students.length !== 1 ? 'i' : ''} totale`}
        actions={
          <Button onClick={() => setSheetOpen(true)} className="bg-coral-500 hover:bg-coral-600 text-white gap-2 h-9 px-4 rounded-xl shadow-sm">
            <Plus className="w-4 h-4" /> Aggiungi studente
          </Button>
        }
      />

      {/* Modal codice di accesso studente */}
      {createdStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-navy-700">Studente creato! 🎉</h2>
              <button onClick={() => setCreatedStudent(null)} className="text-muted-foreground hover:text-navy-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-cream-50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-navy-700">{createdStudent.name}</p>
              {createdStudent.email && (
                <p className="text-xs text-muted-foreground">{createdStudent.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-coral-500" />
                <p className="text-sm font-medium text-navy-700">Codice di accesso studente</p>
              </div>
              <div className="flex items-center gap-3 bg-navy-700 rounded-xl px-4 py-3">
                <code className="font-mono text-2xl font-bold text-white tracking-[0.2em] flex-1 text-center">
                  {createdStudent.accessCode}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdStudent.accessCode ?? '')
                    toast.success('Codice copiato!')
                  }}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Consegna questo codice allo studente insieme alla sua email per accedere all&apos;area studente
              </p>
            </div>
            {createdStudent.email && (
              <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 space-y-1">
                <p className="font-medium">Istruzioni per lo studente:</p>
                <p>1. Vai su <span className="font-mono">/student/login</span></p>
                <p>2. Inserisci: <span className="font-medium">{createdStudent.email}</span></p>
                <p>3. Codice: <span className="font-mono font-bold">{createdStudent.accessCode}</span></p>
              </div>
            )}
            <Button onClick={() => setCreatedStudent(null)} className="w-full bg-coral-500 hover:bg-coral-600 text-white">
              Chiudi
            </Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Cerca per nome o obiettivo..." className="pl-9 bg-white" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Grid studenti */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-cream-200 shadow-[var(--shadow-card)]">
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title={search ? 'Nessun risultato' : 'Nessuno studente ancora'}
            description={search ? 'Prova con un altro termine' : 'Inizia aggiungendo il tuo primo studente'}
            action={!search ? (
              <Button onClick={() => setSheetOpen(true)} className="bg-coral-500 hover:bg-coral-600 text-white gap-2 h-9 px-4 rounded-xl">
                <Plus className="w-4 h-4" /> Aggiungi studente
              </Button>
            ) : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((student: {
            id: string; name: string; currentLevel: string; targetLevel: string;
            targetLanguage: string; goal?: string; isActive: boolean; _count?: { assignments: number }
          }, i: number) => (
            <motion.div key={student.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, ease: [0.4,0,0.2,1] }}>
              <Link href={`/students/${student.id}`}>
                <div className="bg-white rounded-2xl p-5 border border-cream-200 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-px transition-all duration-200 cursor-pointer h-full flex flex-col">
                  <div className="flex items-start gap-3 mb-3">
                    <AvatarInitials name={student.name} size="md" color="blue" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-navy-700 truncate">{student.name}</h3>
                      <p className="text-xs text-muted-foreground">{student.targetLanguage === 'english' ? 'Inglese' : 'Italiano'}</p>
                    </div>
                    <span className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0',
                      student.isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-gray-50 text-gray-500',
                    )}>
                      {student.isActive ? 'Attivo' : 'Pausa'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <CefrBadge level={student.currentLevel} />
                    <span className="text-muted-foreground text-xs">→</span>
                    <CefrBadge level={student.targetLevel} />
                  </div>

                  {student.goal && (
                    <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{student.goal}</p>
                  )}

                  {student._count && (
                    <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-cream-100">
                      {student._count.assignments} assegnazion{student._count.assignments !== 1 ? 'i' : 'e'}
                    </p>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Sheet aggiungi */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader className="mb-6">
            <SheetTitle className="font-display text-xl text-navy-700">Aggiungi studente</SheetTitle>
          </SheetHeader>
          <StudentForm onSubmit={async (data) => { await createMutation.mutateAsync(data) }} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
