import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { generateAccessCode } from '@/lib/student-auth'
import { z } from 'zod'

const studentSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  nativeLanguage: z.string().default('it'),
  targetLanguage: z.string().default('english'),
  currentLevel: z.enum(['A1','A2','B1','B2','C1','C2']),
  targetLevel: z.enum(['A1','A2','B1','B2','C1','C2']),
  goal: z.string().optional(),
  notes: z.string().optional(),
  previousExperience: z.string().optional(),
  learningStyle: z.string().optional(),
  studyHoursPerWeek: z.coerce.number().optional(),
  readingScore: z.coerce.number().optional(),
  writingScore: z.coerce.number().optional(),
  listeningScore: z.coerce.number().optional(),
  speakingScore: z.coerce.number().optional(),
  grammarScore: z.coerce.number().optional(),
  vocabularyScore: z.coerce.number().optional(),
})

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const students = await prisma.student.findMany({
    where: { teacherId: session.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { assignments: true } } },
  })
  return NextResponse.json(students)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const data = studentSchema.parse(body)

  const student = await prisma.student.create({
    data: {
      ...data,
      teacherId: session.id,
      email: data.email ? data.email.toLowerCase().trim() : null,
      phone: data.phone || null,
      accessCode: generateAccessCode(),
    },
  })
  return NextResponse.json(student, { status: 201 })
}
