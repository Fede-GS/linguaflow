import type { Metadata } from 'next'
import { LogoutButtonClient } from './LogoutButtonClient'

export const metadata: Metadata = {
  title: 'LinguaFlow – Area Studente',
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream-50 font-sans">
      <header className="bg-white border-b border-cream-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <div className="w-8 h-8 rounded-lg bg-coral-500 flex items-center justify-center">
          <span className="text-white text-xs font-bold">LF</span>
        </div>
        <span className="font-display font-semibold text-navy-700">LinguaFlow</span>
        <span className="text-cream-300">·</span>
        <span className="text-sm text-muted-foreground">Area studente</span>
        <div className="ml-auto">
          <LogoutButtonClient />
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
