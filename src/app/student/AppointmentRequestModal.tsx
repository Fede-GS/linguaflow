'use client'

import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

export function AppointmentRequestModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    title: 'Lezione di lingua',
    description: '',
    startTime: '',
    endTime: '',
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.startTime || !form.endTime) { toast.error('Inserisci orario inizio e fine'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/student/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      toast.success('Richiesta inviata! L\'insegnante la confermerà presto.')
      queryClient.invalidateQueries({ queryKey: ['student-appointments'] })
      onClose()
    } catch {
      toast.error('Errore nell\'invio della richiesta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-navy-700">Richiedi una lezione</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-navy-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Proponi un orario — il tuo insegnante dovrà confermare.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Titolo</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Inizio</Label>
              <Input type="datetime-local" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Fine</Label>
              <Input type="datetime-local" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Note <span className="text-muted-foreground text-xs">(opzionale)</span></Label>
            <Textarea placeholder="Argomenti da trattare, preferenze..." rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annulla</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-coral-500 hover:bg-coral-600 text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Invia richiesta'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
