'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  BookOpen,
  LayoutDashboard,
  Users,
  ClipboardCheck,
  LogOut,
  Sparkles,
  Library,
  CalendarDays,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLanguage()

  const navItems = [
    { href: '/',            label: t.nav.dashboard,        icon: LayoutDashboard, exact: true },
    { href: '/students',    label: t.nav.students,         icon: Users },
    { href: '/blocks/new',  label: t.nav.createExercises,  icon: Sparkles, badge: 'AI' },
    { href: '/assignments', label: t.nav.assignments,       icon: ClipboardCheck },
    { href: '/exercises',   label: t.nav.library,           icon: Library },
    { href: '/calendar',    label: t.nav.calendar,          icon: CalendarDays },
  ]

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-60 min-h-screen bg-navy-800 flex flex-col flex-shrink-0 relative">
      {/* Subtle top-right radial glow */}
      <div
        className="absolute top-0 right-0 w-32 h-32 opacity-[0.07] pointer-events-none"
        style={{
          background: 'radial-gradient(circle at top right, #E87040, transparent 70%)',
        }}
      />

      {/* ── Logo ─────────────────────────────────────── */}
      <div className="h-16 px-4 flex items-center border-b border-white/[0.07] flex-shrink-0">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-coral-500 flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform duration-200">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="font-display text-[17px] font-bold text-white tracking-tight">
            LinguaFlow
          </span>
        </Link>
      </div>

      {/* ── Navigation ───────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25 px-3 mb-3">
          {t.nav.menu}
        </p>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.exact
            ? pathname === '/'
            : pathname.startsWith(item.href)

          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 2 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  'relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-150',
                  isActive
                    ? 'bg-coral-500 text-white shadow-sm'
                    : 'text-white/55 hover:text-white hover:bg-white/[0.07]',
                )}
              >
                {/* Active indicator dot */}
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active-dot"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white rounded-r-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 leading-tight">{item.label}</span>
                {item.badge && (
                  <span
                    className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-coral-500/20 text-coral-300',
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </motion.div>
            </Link>
          )
        })}
      </nav>

      {/* ── Footer ───────────────────────────────────── */}
      <div className="px-3 pb-4 pt-2 border-t border-white/[0.07] flex-shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-white/35 hover:text-white hover:bg-white/[0.07] transition-colors duration-150"
        >
          <LogOut className="w-4 h-4" />
          <span>{t.nav.logout}</span>
        </button>
      </div>
    </aside>
  )
}
