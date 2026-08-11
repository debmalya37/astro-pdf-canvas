import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('auth_token')
  const isLoginPage = request.nextUrl.pathname.startsWith('/login')

  // If trying to access the PDF tool without being logged in, redirect to login page
  if (!authCookie && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If already logged in and trying to access the login page, redirect back to the PDF tool
  if (authCookie && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

// Specify exactly which routes to run this logic on
export const config = {
  matcher: ['/', '/login'], 
}