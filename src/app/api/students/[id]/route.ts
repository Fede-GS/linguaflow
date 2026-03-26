import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const student = await prisma.student.findFirst({
    where: { id, teacherId: session.id },
    include: {
      assignments: {
        include: { exercise: true },
        orderBy: { assignedAt: 'desc' },
      },
      blocks: {
        include: {
          items: {
            include: {
              exercise: { select: { id: true, title: true, type: true, cefrLevel: true, skillFocus: true, estimatedMinutes: true } },
            },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(student)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  const student = await prisma.student.updateMany({
    where: { id, teacherId: session.id },
    data: body,
  })
  return NextResponse.json(student)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  await prisma.student.deleteMany({ where: { id, teacherId: session.id } })
  return NextResponse.json({ ok: true })
}
