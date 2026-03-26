import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e password richiesti' }, { status: 400 })
    }

    const teacher = await prisma.teacher.findUnique({ where: { email } })

    if (!teacher) {
      return NextResponse.json({ error: 'Credenziali non valide' }, { status: 401 })
    }

    const valid = await verifyPassword(password, teacher.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Credenziali non valide' }, { status: 401 })
    }

    const cookieStore = await cookies()
    cookieStore.set('teacher_id', teacher.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 giorni
      path: '/',
    })

    return NextResponse.json({ id: teacher.id, name: teacher.name, email: teacher.email })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Errore del server' }, { status: 500 })
  }
}
