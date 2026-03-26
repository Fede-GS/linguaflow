import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, GraduationCap, Layers, ArrowRight, Plus, CheckCircle, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { formatRelative, CEFR_BADGE_CLASS, type CefrLevel } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { PageHeader, SectionCard, StatCard, EmptyState, AvatarInitials, ProgressBar } from '@/components/ui/lf-components'
import { DashboardCalendar } from '@/components/dashboard/DashboardCalendar'

async function getDashboardData(teacherId: string) {
  const [studentCount, exerciseCount, activeBlocks, completedBlocks] = await Promise.all([
    prisma.student.count({ where: { teacherId, isActive: true } }),
    prisma.exercise.count({ where: { teacherId } }),
    prisma.exerciseBlock.count({ where: { teacherId, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } } }),
    prisma.exerciseBlock.count({ where: { teacherId, status: 'COMPLETED' } }),
  ])

  const recentStudents = await prisma.student.findMany({
    where: { teacherId, isActive: true },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const pendingBlocks = await prisma.exerciseBlock.findMany({
    where: { teacherId, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
    include: {
      student: { select: { id: true, name: true, currentLevel: true } },
      items: { select: { status: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 4,
  })

  const completedBlocksToGrade = await prisma.exerciseBlock.findMany({
    where: { teacherId, status: 'COMPLETED' },
    include: {
      student: { select: { id: true, name: true } },
      items: { select: { status: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 3,
  })

  return { studentCount, exerciseCount, activeBlocks, completedBlocks, recentStudents, pendingBlocks, completedBlocksToGrade }
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const data = await getDashboardData(session.id)
  const firstName = session.name.split(' ')[0]

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────── */}
      <PageHeader
        title={<>Ciao, {firstName} 👋</>}
        subtitle="Ecco la situazione della tua classe oggi."
        actions={
          <Link href="/blocks/new">
            <Button className="bg-coral-500 hover:bg-coral-600 text-white gap-2 h-9 px-4 rounded-xl shadow-sm">
              <Plus className="w-4 h-4" /> Nuovo blocco
            </Button>
          </Link>
        }
      />

      {/* ── Stat cards ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Studenti attivi', value: data.studentCount,    icon: <Users className="w-5 h-5" />,         bg: 'bg-edu-blue-500/10', color: 'text-edu-blue-500', href: '/students' },
          { label: 'Esercizi creati', value: data.exerciseCount,   icon: <GraduationCap className="w-5 h-5" />, bg: 'bg-coral-500/10',    color: 'text-coral-500',    href: '/exercises' },
          { label: 'Blocchi attivi',  value: data.activeBlocks,    icon: <Layers className="w-5 h-5" />,        bg: 'bg-amber-500/10',    color: 'text-amber-500',    href: '/assignments' },
          { label: 'Da correggere',   value: data.completedBlocks, icon: <Star className="w-5 h-5" />,          bg: 'bg-violet-500/10',   color: 'text-violet-500',   href: '/assignments' },
        ].map(s => (
          <Link key={s.label} href={s.href}>
            <StatCard label={s.label} value={s.value} icon={s.icon} iconBg={s.bg} iconColor={s.color} />
          </Link>
        ))}
      </div>

      {/* ── Main grid ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left (2/3) */}
        <div className="lg:col-span-2 space-y-4">

          {/* Da correggere */}
          {data.completedBlocksToGrade.length > 0 && (
            <SectionCard
              title={<>Da correggere <span className="text-amber-600 font-normal">({data.completedBlocks})</span></>}
              icon={<Star className="w-4 h-4 text-amber-500" />}
              actions={
                <Link href="/assignments">
                  <Button variant="ghost" size="sm" className="text-coral-500 text-xs gap-1 h-7">
                    Vedi tutti <ArrowRight className="w-3 h-3" />
                  </Button>
                </Link>
              }
              className="border-amber-100"
            >
              <div className="divide-y divide-cream-100">
                {data.completedBlocksToGrade.map(block => {
                  const done = block.items.filter(i => ['SUBMITTED', 'GRADED', 'RETURNED'].includes(i.status)).length
                  return (
                    <Link key={block.id} href="/assignments">
                      <div className="px-5 py-3 flex items-center gap-3 hover:bg-cream-50 transition-colors cursor-pointer">
                        <AvatarInitials name={block.student.name} size="sm" color="amber" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-navy-700 truncate">{block.student.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{block.title} · {done}/{block.items.length} esercizi</p>
                        </div>
                        <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg flex-shrink-0 font-medium">
                          Correggi →
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </SectionCard>
          )}

          {/* Blocchi attivi */}
          <SectionCard
            title="Blocchi attivi"
            icon={<Layers className="w-4 h-4 text-coral-500" />}
            actions={
              <Link href="/assignments">
                <Button variant="ghost" size="sm" className="text-coral-500 text-xs gap-1 h-7">
                  Tutti <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            }
          >
            {data.pendingBlocks.length === 0 ? (
              <EmptyState
                icon={<Layers className="w-8 h-8" />}
                title="Nessun blocco attivo"
                action={
                  <Link href="/blocks/new">
                    <Button size="sm" className="bg-coral-500 hover:bg-coral-600 text-white gap-1.5 h-8">
                      <Plus className="w-3.5 h-3.5" /> Crea blocco
                    </Button>
                  </Link>
                }
                className="py-10"
              />
            ) : (
              <div className="divide-y divide-cream-100">
                {data.pendingBlocks.map(block => {
                  const done  = block.items.filter(i => ['SUBMITTED', 'GRADED', 'RETURNED'].includes(i.status)).length
                  const total = block.items.length
                  const isIP  = block.status === 'IN_PROGRESS'
                  return (
                    <div key={block.id} className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-0.5', isIP ? 'bg-amber-400' : 'bg-edu-blue-400')} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <p className="text-sm font-medium text-navy-700 truncate">
                              <Link href={`/students/${block.student.id}`} className="hover:text-coral-500 transition-colors">
                                {block.student.name}
                              </Link>
                            </p>
                            <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums">{done}/{total}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mb-1.5">{block.title}</p>
                          <ProgressBar value={done} max={total || 1} color={isIP ? 'amber' : 'blue'} size="xs" />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>

          {/* Studenti recenti */}
          <SectionCard
            title="Studenti recenti"
            icon={<Users className="w-4 h-4 text-edu-blue-500" />}
            actions={
              <Link href="/students">
                <Button variant="ghost" size="sm" className="text-coral-500 text-xs gap-1 h-7">
                  Vedi tutti <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            }
          >
            {data.recentStudents.length === 0 ? (
              <EmptyState
                icon={<Users className="w-8 h-8" />}
                title="Nessuno studente ancora"
                action={
                  <Link href="/students">
                    <Button size="sm" className="bg-coral-500 hover:bg-coral-600 text-white gap-1.5 h-8">
                      <Plus className="w-3.5 h-3.5" /> Aggiungi studente
                    </Button>
                  </Link>
                }
                className="py-8"
              />
            ) : (
              <div className="divide-y divide-cream-100">
                {data.recentStudents.map(student => (
                  <Link key={student.id} href={`/students/${student.id}`}>
                    <div className="px-5 py-3 flex items-center gap-3 hover:bg-cream-50 transition-colors cursor-pointer">
                      <AvatarInitials name={student.name} size="sm" color="blue" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-navy-700 truncate">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{formatRelative(student.createdAt)}</p>
                      </div>
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-md flex-shrink-0', CEFR_BADGE_CLASS[student.currentLevel as CefrLevel])}>
                        {student.currentLevel}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Right (1/3) — Calendar widget (client) */}
        <div className="space-y-4">
          <DashboardCalendar />

          {/* Quick actions */}
          <div className="bg-white rounded-2xl border border-cream-200 shadow-[var(--shadow-card)] overflow-hidden">
            <div className="px-4 py-3 border-b border-cream-100">
              <p className="text-sm font-semibold text-navy-700">Azioni rapide</p>
            </div>
            <div className="p-2 space-y-0.5">
              {[
                { label: 'Crea blocco esercizi', href: '/blocks/new',    icon: Layers,        color: 'text-coral-500',     bg: 'bg-coral-50' },
                { label: 'Genera con AI',         href: '/exercises/new', icon: GraduationCap, color: 'text-edu-blue-500', bg: 'bg-edu-blue-50' },
                { label: 'Esercizi assegnati',    href: '/assignments',   icon: CheckCircle,   color: 'text-amber-500',    bg: 'bg-amber-50' },
              ].map(action => {
                const Icon = action.icon
                return (
                  <Link key={action.href} href={action.href}>
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-cream-50 transition-colors cursor-pointer group">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', action.bg)}>
                        <Icon className={cn('w-4 h-4', action.color)} />
                      </div>
                      <span className="text-sm text-navy-700 flex-1">{action.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-cream-300 group-hover:text-muted-foreground transition-colors" />
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
