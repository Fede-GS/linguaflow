'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function StudentLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/student/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), accessCode: code.trim().toUpperCase() }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Credenziali non valide')
        return
      }
      router.push('/student')
      router.refresh()
    } catch {
      toast.error('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-coral-500 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-navy-700">LinguaFlow</h1>
          <p className="text-muted-foreground mt-1 text-sm">Accedi con le credenziali fornite dal tuo insegnante</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-cream-200">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label>La tua email</Label>
              <Input
                type="email"
                placeholder="nome@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Codice di accesso</Label>
              <Input
                placeholder="es. ABC12345"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                required
                maxLength={8}
                className="font-mono tracking-widest text-center uppercase text-lg"
              />
              <p className="text-xs text-muted-foreground">Codice di 8 caratteri fornito dal tuo insegnante</p>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-coral-500 hover:bg-coral-600 text-white font-medium h-11">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Accesso...</> : 'Accedi'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
