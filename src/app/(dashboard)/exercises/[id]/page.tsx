'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Users, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { CefrBadge } from '@/components/students/CefrBadge'
import { ExercisePreview } from '@/components/exercises/ExercisePreview'
import { EXERCISE_TYPE_LABELS, SKILL_FOCUS_LABELS } from '@/lib/utils'

export default function ExercisePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const [assignDialog, setAssignDialog] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])

  const { data: exercise, isLoading } = useQuery({
    queryKey: ['exercise', id],
    queryFn: () => fetch(`/api/exercises/${id}`).then(r => r.json()),
  })

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => fetch('/api/students').then(r => r.json()),
  })

  const assignMutation = useMutation({
    mutationFn: () => fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exerciseId: id, studentIds: selectedStudents }),
    }).then(r => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise', id] })
      setAssignDialog(false)
      setSelectedStudents([])
      toast.success('Esercizio assegnato!')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => fetch(`/api/exercises/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => { router.push('/exercises'); toast.success('Esercizio eliminato') },
  })

  const toggleStudent = (sid: string) => setSelectedStudents(prev => prev.includes(sid) ? prev.filter(x => x !== sid) : [...prev, sid])

  if (isLoading) return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  )
  if (!exercise || exercise.error) return (
    <div className="text-center py-20"><p className="text-muted-foreground">Esercizio non trovato.</p></div>
  )

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/exercises" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-navy-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Libreria esercizi
      </Link>

      <div className="bg-white rounded-2xl p-6 border border-cream-200 shadow-sm">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-navy-700">{exercise.title}</h1>
            {exercise.description && <p className="text-muted-foreground mt-1 text-sm">{exercise.description}</p>}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button onClick={() => setAssignDialog(true)} className="bg-coral-500 hover:bg-coral-600 text-white gap-2">
              <Users className="w-4 h-4" /> Assegna
            </Button>
            <Button variant="outline" size="icon" onClick={() => { if (confirm('Eliminare?')) deleteMutation.mutate() }} className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <CefrBadge level={exercise.cefrLevel} />
          <Badge variant="outline" className="text-xs">{EXERCISE_TYPE_LABELS[exercise.type]}</Badge>
          <Badge variant="outline" className="text-xs">{SKILL_FOCUS_LABELS[exercise.skillFocus]}</Badge>
          <Badge variant="outline" className="text-xs">{exercise.estimatedMinutes} min</Badge>
          {exercise.aiGenerated && <Badge variant="outline" className="text-xs text-coral-500 border-coral-200 bg-coral-50">AI</Badge>}
        </div>
        {exercise.topic && <p className="text-sm text-muted-foreground mt-3">Argomento: <span className="font-medium">{exercise.topic}</span></p>}
      </div>

      {/* Preview contenuto */}
      <div className="bg-white rounded-2xl p-6 border border-cream-200 shadow-sm">
        <h2 className="font-semibold text-navy-700 mb-4">Contenuto esercizio</h2>
        <Separator className="mb-4" />
        <ExercisePreview type={exercise.type} content={exercise.content} />
      </div>

      {/* Assegnazioni esistenti */}
      {exercise.assignments?.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-cream-200 shadow-sm">
          <h2 className="font-semibold text-navy-700 mb-4">Assegnato a</h2>
          <div className="space-y-2">
            {exercise.assignments.map((a: { id: string; student: { name: string }; status: string }) => (
              <Link key={a.id} href={`/assignments/${a.id}`}>
                <div className="flex items-center justify-between p-3 rounded-xl hover:bg-cream-50 transition-colors">
                  <span className="text-sm font-medium text-navy-700">{a.student.name}</span>
                  <Badge variant="outline" className="text-xs">{a.status}</Badge>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Dialog assegna */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-navy-700">Assegna a studenti</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {students.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nessuno studente ancora. <Link href="/students" className="text-coral-500">Aggiungine uno</Link></p>
            ) : students.map((s: { id: string; name: string; currentLevel: string }) => (
              <label key={s.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-cream-50 cursor-pointer">
                <input type="checkbox" checked={selectedStudents.includes(s.id)} onChange={() => toggleStudent(s.id)} className="accent-coral-500" />
                <span className="text-sm font-medium text-navy-700">{s.name}</span>
                <CefrBadge level={s.currentLevel} />
              </label>
            ))}
          </div>
          <Button
            onClick={() => assignMutation.mutate()}
            disabled={selectedStudents.length === 0 || assignMutation.isPending}
            className="w-full bg-coral-500 hover:bg-coral-600 text-white"
          >
            {assignMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Assegna a {selectedStudents.length > 0 ? `${selectedStudents.length} studente${selectedStudents.length > 1 ? 'i' : ''}` : 'studenti selezionati'}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
