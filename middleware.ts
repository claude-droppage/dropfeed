import { NextRequest, NextResponse } from 'next/server'

const COOKIE = 'dropfeed_onboarded'

export function middleware(request: NextRequest) {
  const onboarded = request.cookies.get(COOKIE)
  if (!onboarded) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/feed', '/boards', '/boards/:path*', '/discover', '/profile'],
}
