import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const { email, accessCode } = await req.json()

  if (!email || !accessCode) {
    return NextResponse.json({ error: 'Email e codice richiesti' }, { status: 400 })
  }

  const student = await prisma.student.findFirst({
    where: {
      email: email.trim().toLowerCase(),
      accessCode: accessCode.trim().toUpperCase(),
    },
    select: { id: true, name: true, currentLevel: true, targetLevel: true, targetLanguage: true },
  })

  if (!student) {
    return NextResponse.json({ error: 'Email o codice non validi' }, { status: 401 })
  }

  const cookieStore = await cookies()
  cookieStore.set('student_id', student.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  return NextResponse.json(student)
}
