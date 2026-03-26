import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getStudentSession } from '@/lib/student-auth'

// Public endpoint — supports cookie-based auth or studentId param
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  let studentId = searchParams.get('studentId')

  if (!studentId) {
    const session = await getStudentSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    studentId = session.id
  }

  const blocks = await prisma.exerciseBlock.findMany({
    where: { studentId },
    include: {
      items: {
        include: {
          exercise: {
            select: {
              id: true, title: true, type: true, cefrLevel: true,
              skillFocus: true, estimatedMinutes: true, content: true, topic: true,
            },
          },
        },
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(blocks)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { blockId, itemId, status, studentAnswers, timeSpentSeconds } = body

  if (itemId) {
    const item = await prisma.blockItem.update({
      where: { id: itemId },
      data: {
        status: status ?? undefined,
        studentAnswers: studentAnswers ?? undefined,
        timeSpentSeconds: timeSpentSeconds ?? undefined,
        submittedAt: status === 'SUBMITTED' ? new Date() : undefined,
      },
    })

    // Check if all items in block are submitted → mark block as completed
    if (status === 'SUBMITTED') {
      const block = await prisma.exerciseBlock.findUnique({
        where: { id: blockId },
        include: { items: { select: { status: true } } },
      })
      if (block) {
        const allDone = block.items.every(i => ['SUBMITTED', 'GRADED', 'RETURNED'].includes(i.status))
        if (allDone) {
          await prisma.exerciseBlock.update({
            where: { id: blockId },
            data: { status: 'COMPLETED' },
          })
        } else {
          await prisma.exerciseBlock.update({
            where: { id: blockId },
            data: { status: 'IN_PROGRESS' },
          })
        }
      }
    }

    return NextResponse.json(item)
  }

  if (blockId && status) {
    const block = await prisma.exerciseBlock.update({
      where: { id: blockId },
      data: { status },
    })
    return NextResponse.json(block)
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}
