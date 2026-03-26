import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getStudentSession } from '@/lib/student-auth'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStudentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const item = await prisma.blockItem.findUnique({
    where: { id },
    include: {
      exercise: true,
      block: {
        select: { id: true, title: true, studentId: true },
      },
    },
  })

  if (!item || item.block.studentId !== session.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(item)
}
