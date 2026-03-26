'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LogoutButtonClient() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/student/auth/logout', { method: 'POST' })
    router.push('/student/login')
    router.refresh()
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground gap-1.5 text-xs">
      <LogOut className="w-3.5 h-3.5" /> Esci
    </Button>
  )
}
