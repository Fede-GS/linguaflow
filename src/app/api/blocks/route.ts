import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('studentId')

  const blocks = await prisma.exerciseBlock.findMany({
    where: { teacherId: session.id, ...(studentId ? { studentId } : {}) },
    include: {
      student: { select: { id: true, name: true, currentLevel: true } },
      items: {
        include: {
          exercise: {
            select: { id: true, title: true, type: true, cefrLevel: true, skillFocus: true, estimatedMinutes: true, content: true },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(blocks)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { studentId, title, topics, comments, dueDate, items } = body

  const block = await prisma.exerciseBlock.create({
    data: {
      teacherId: session.id,
      studentId,
      title,
      topics: topics || [],
      comments: comments || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      items: {
        create: (items || []).map((item: { exerciseId: string; topicLabel?: string }, idx: number) => ({
          exerciseId: item.exerciseId,
          order: idx,
          topicLabel: item.topicLabel || null,
        })),
      },
    },
    include: {
      student: { select: { id: true, name: true } },
      items: {
        include: {
          exercise: { select: { id: true, title: true, type: true } },
        },
        orderBy: { order: 'asc' },
      },
    },
  })

  return NextResponse.json(block)
}
