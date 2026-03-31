import { Bell } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { getSession } from '@/lib/auth'
import { LanguageSwitcher } from './LanguageSwitcher'

export async function Header() {
  const session = await getSession()
  const name = session?.name ?? 'Insegnante'

  return (
    <header
      className="h-16 border-b border-cream-200/70 flex items-center justify-between px-6 sticky top-0 z-[var(--z-header)] flex-shrink-0"
      style={{
        background: 'rgba(247,245,240,0.88)',
        backdropFilter: 'blur(16px) saturate(160%)',
        WebkitBackdropFilter: 'blur(16px) saturate(160%)',
      }}
    >
      {/* Left: page slot (empty — pages own their headings) */}
      <div />

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Language toggle */}
        <LanguageSwitcher />

        {/* Divider */}
        <div className="w-px h-5 bg-cream-200 mx-1" />

        {/* Notification bell */}
        <button
          className="relative p-2 rounded-xl hover:bg-cream-200/60 transition-colors duration-150 text-navy-700/50 hover:text-navy-700"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-cream-200 mx-1" />

        {/* User chip */}
        <div className="flex items-center gap-2.5 pl-1 pr-2 py-1.5 rounded-xl hover:bg-cream-200/60 transition-colors duration-150 cursor-pointer">
          <Avatar className="w-7 h-7">
            <AvatarFallback className="bg-coral-500 text-white text-[10px] font-bold">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-navy-700 leading-none">{name}</span>
        </div>
      </div>
    </header>
  )
}
