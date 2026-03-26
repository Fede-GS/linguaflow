import { NextResponse } from 'next/server'
import { getStudentSession } from '@/lib/student-auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getStudentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const student = await prisma.student.findUnique({
    where: { id: session.id },
    select: {
      id: true, name: true, email: true, currentLevel: true, targetLevel: true,
      targetLanguage: true, goal: true, readingScore: true, writingScore: true,
      listeningScore: true, speakingScore: true, grammarScore: true, vocabularyScore: true,
    },
  })
  return NextResponse.json(student)
}
