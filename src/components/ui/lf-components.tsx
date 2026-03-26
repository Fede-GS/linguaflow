'use client'

/**
 * LinguaFlow shared design-system components.
 * Visual layer only — no business logic.
 */

import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/* ─────────────────────────────────────────────────────────
   PAGE HEADER
   Usage: <PageHeader title="Studenti" subtitle="12 studenti" actions={<Button>...</Button>} />
───────────────────────────────────────────────────────── */
export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-bold text-navy-700 leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   SECTION CARD
   A white rounded card with optional header row.
───────────────────────────────────────────────────────── */
export function SectionCard({
  title,
  icon,
  actions,
  children,
  className,
  noPadding,
}: {
  title?: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  noPadding?: boolean
}) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-cream-200 overflow-hidden',
        'shadow-[var(--shadow-card)]',
        className,
      )}
    >
      {(title || actions) && (
        <div className="px-5 py-4 border-b border-cream-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-semibold text-navy-700 text-sm">
            {icon && <span className="flex-shrink-0 text-muted-foreground">{icon}</span>}
            {title}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={noPadding ? '' : ''}>{children}</div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   STAT CARD
───────────────────────────────────────────────────────── */
export function StatCard({
  label,
  value,
  icon,
  iconBg,
  iconColor,
  trend,
  className,
}: {
  label: string
  value: ReactNode
  icon: ReactNode
  iconBg?: string
  iconColor?: string
  trend?: { value: string; positive?: boolean }
  className?: string
}) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl p-4 border border-cream-200',
        'shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]',
        'transition-shadow duration-200 flex items-center gap-3 cursor-pointer',
        className,
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
          iconBg ?? 'bg-cream-200',
        )}
      >
        <span className={cn('w-5 h-5', iconColor ?? 'text-navy-700')}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-bold text-navy-700 leading-none tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{label}</p>
      </div>
      {trend && (
        <span
          className={cn(
            'text-xs font-medium px-1.5 py-0.5 rounded-full flex-shrink-0',
            trend.positive
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-600',
          )}
        >
          {trend.value}
        </span>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   EMPTY STATE
───────────────────────────────────────────────────────── */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'py-16 px-6',
        className,
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-cream-100 flex items-center justify-center mb-4 text-cream-300">
        {icon}
      </div>
      <h3 className="font-display text-lg text-navy-700 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs mb-4">{description}</p>
      )}
      {action && action}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   FILTER CHIP  (toggle pill)
───────────────────────────────────────────────────────── */
export function FilterChip({
  label,
  active,
  onClick,
  className,
}: {
  label: string
  active?: boolean
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium',
        'border transition-colors duration-150 whitespace-nowrap',
        active
          ? 'bg-coral-500 text-white border-coral-500'
          : 'bg-white text-navy-700 border-cream-200 hover:border-coral-300 hover:text-coral-500',
        className,
      )}
    >
      {label}
    </button>
  )
}

/* ─────────────────────────────────────────────────────────
   AVATAR INITIALS
───────────────────────────────────────────────────────── */
type AvatarSize = 'xs' | 'sm' | 'md' | 'lg'

const avatarSizes: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
}

export function AvatarInitials({
  name,
  size = 'sm',
  color = 'blue',
  className,
}: {
  name: string
  size?: AvatarSize
  color?: 'blue' | 'coral' | 'green' | 'amber' | 'purple'
  className?: string
}) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const colorMap: Record<string, string> = {
    blue:   'bg-edu-blue-500 text-white',
    coral:  'bg-coral-500 text-white',
    green:  'bg-emerald-500 text-white',
    amber:  'bg-amber-400 text-amber-900',
    purple: 'bg-violet-500 text-white',
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold flex-shrink-0',
        avatarSizes[size],
        colorMap[color] ?? colorMap.blue,
        className,
      )}
    >
      {initials}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   SKELETON ROW  (loading placeholder)
───────────────────────────────────────────────────────── */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-cream-200 overflow-hidden animate-pulse',
        className,
      )}
    >
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-cream-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-cream-200 rounded-lg w-2/3" />
            <div className="h-3 bg-cream-200 rounded-lg w-1/2" />
          </div>
        </div>
        <div className="h-3 bg-cream-200 rounded-lg w-full" />
        <div className="h-3 bg-cream-200 rounded-lg w-4/5" />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   PROGRESS BAR
───────────────────────────────────────────────────────── */
export function ProgressBar({
  value,
  max = 100,
  color = 'coral',
  size = 'sm',
  className,
}: {
  value: number
  max?: number
  color?: 'coral' | 'blue' | 'green' | 'amber'
  size?: 'xs' | 'sm' | 'md'
  className?: string
}) {
  const pct = Math.min(100, (value / max) * 100)

  const colorMap: Record<string, string> = {
    coral: 'bg-coral-500',
    blue:  'bg-edu-blue-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-400',
  }

  const heights: Record<string, string> = {
    xs: 'h-0.5',
    sm: 'h-1',
    md: 'h-1.5',
  }

  return (
    <div className={cn('bg-cream-200 rounded-full overflow-hidden', heights[size], className)}>
      <div
        className={cn('h-full rounded-full', colorMap[color])}
        style={{ width: `${pct}%`, transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   TAB BAR
───────────────────────────────────────────────────────── */
export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { value: T; label: string; count?: number }[]
  active: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={cn('flex gap-0.5 bg-cream-100 p-1 rounded-xl w-fit', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            'relative px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
            active === tab.value
              ? 'bg-white text-navy-700 shadow-[var(--shadow-xs)]'
              : 'text-muted-foreground hover:text-navy-700',
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                'ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold',
                active === tab.value
                  ? 'bg-coral-500 text-white'
                  : 'bg-cream-200 text-muted-foreground',
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   ANIMATED LIST ITEM  (motion wrapper)
───────────────────────────────────────────────────────── */
export function AnimatedItem({
  index = 0,
  children,
  className,
}: {
  index?: number
  children: ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: [0.4, 0, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
