import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const exercises = await prisma.exercise.findMany({
    where: { teacherId: session.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { assignments: true } } },
  })
  return NextResponse.json(exercises)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const exercise = await prisma.exercise.create({
    data: { ...body, teacherId: session.id },
  })
  return NextResponse.json(exercise, { status: 201 })
}
