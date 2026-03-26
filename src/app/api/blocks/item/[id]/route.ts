import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const item = await prisma.blockItem.findUnique({
    where: { id },
    include: {
      exercise: true,
      block: {
        select: {
          id: true,
          title: true,
          teacherId: true,
          student: { select: { id: true, name: true, currentLevel: true, targetLevel: true } },
        },
      },
    },
  })

  if (!item || item.block.teacherId !== session.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(item)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  const item = await prisma.blockItem.findUnique({
    where: { id },
    include: { block: { select: { teacherId: true, id: true } } },
  })

  if (!item || item.block.teacherId !== session.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updated = await prisma.blockItem.update({
    where: { id },
    data: {
      teacherScore: body.teacherScore !== undefined ? body.teacherScore : undefined,
      teacherFeedback: body.teacherFeedback !== undefined ? body.teacherFeedback : undefined,
      status: body.status ?? undefined,
    },
  })

  return NextResponse.json(updated)
}
