import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const assignments = await prisma.assignment.findMany({
    where: { exercise: { teacherId: session.id } },
    include: { exercise: true, student: true },
    orderBy: { assignedAt: 'desc' },
  })
  return NextResponse.json(assignments)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { exerciseId, studentIds, dueDate } = await req.json()

  // Verifica che l'esercizio appartenga all'insegnante
  const exercise = await prisma.exercise.findFirst({
    where: { id: exerciseId, teacherId: session.id },
  })
  if (!exercise) return NextResponse.json({ error: 'Esercizio non trovato' }, { status: 404 })

  const assignments = await prisma.assignment.createMany({
    data: studentIds.map((studentId: string) => ({
      exerciseId,
      studentId,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'ASSIGNED',
    })),
    skipDuplicates: true,
  })

  return NextResponse.json(assignments, { status: 201 })
}
