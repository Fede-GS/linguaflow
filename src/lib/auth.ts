import { cookies } from 'next/headers'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export type AuthTeacher = {
  id: string
  email: string
  name: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function getSession(): Promise<AuthTeacher | null> {
  const cookieStore = await cookies()
  const teacherId = cookieStore.get('teacher_id')?.value
  if (!teacherId) return null

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { id: true, email: true, name: true },
  })
  return teacher
}

export async function requireAuth(): Promise<AuthTeacher> {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}
