import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Protect student routes (except login)
  if (pathname.startsWith('/student') && !pathname.startsWith('/student/login')) {
    const studentId = req.cookies.get('student_id')?.value
    if (!studentId) {
      const loginUrl = new URL('/student/login', req.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/student/:path*'],
}
