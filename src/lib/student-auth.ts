import { cookies } from 'next/headers'
import { prisma } from './prisma'

export type AuthStudent = {
  id: string
  name: string
  email: string | null
  accessCode: string | null
  teacherId: string
  currentLevel: string
  targetLevel: string
  targetLanguage: string
}

export async function getStudentSession(): Promise<AuthStudent | null> {
  const cookieStore = await cookies()
  const studentId = cookieStore.get('student_id')?.value
  if (!studentId) return null

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true, name: true, email: true, accessCode: true,
      teacherId: true, currentLevel: true, targetLevel: true, targetLanguage: true,
    },
  })
  return student as AuthStudent | null
}

export function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
