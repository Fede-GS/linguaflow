import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const block = await prisma.exerciseBlock.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, name: true, currentLevel: true, targetLevel: true, targetLanguage: true } },
      items: {
        include: {
          exercise: true,
        },
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!block || block.teacherId !== session.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(block)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  const block = await prisma.exerciseBlock.update({
    where: { id },
    data: {
      title: body.title,
      topics: body.topics,
      comments: body.comments,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      status: body.status,
    },
  })
  return NextResponse.json(block)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  await prisma.exerciseBlock.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
