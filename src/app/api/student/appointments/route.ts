import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getStudentSession } from '@/lib/student-auth'

export async function GET() {
  const session = await getStudentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const appointments = await prisma.appointment.findMany({
    where: { studentId: session.id },
    orderBy: { startTime: 'asc' },
  })
  return NextResponse.json(appointments)
}

export async function POST(req: NextRequest) {
  const session = await getStudentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // Get student's teacherId
  const student = await prisma.student.findUnique({
    where: { id: session.id },
    select: { teacherId: true },
  })
  if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const appointment = await prisma.appointment.create({
    data: {
      teacherId: student.teacherId,
      studentId: session.id,
      title: body.title,
      description: body.description || null,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      status: 'PENDING',
      proposedBy: 'student',
    },
  })
  return NextResponse.json(appointment, { status: 201 })
}
