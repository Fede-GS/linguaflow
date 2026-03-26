import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('studentId')

  const appointments = await prisma.appointment.findMany({
    where: {
      teacherId: session.id,
      ...(studentId ? { studentId } : {}),
    },
    include: {
      student: { select: { id: true, name: true } },
    },
    orderBy: { startTime: 'asc' },
  })
  return NextResponse.json(appointments)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const appointment = await prisma.appointment.create({
    data: {
      teacherId: session.id,
      studentId: body.studentId,
      title: body.title,
      description: body.description || null,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      status: body.status || 'CONFIRMED',
      proposedBy: 'teacher',
      location: body.location || null,
    },
    include: {
      student: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(appointment, { status: 201 })
}
