import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

const PROTECTED = ['/feed', '/boards', '/discover', '/profile', '/onboarding']
const AUTH_PAGES = ['/login', '/register'] // reset-password celowo pomijamy (sesja recovery)

// Proxy (Next 16): odświeża sesję + bramki auth (wszystko za logowaniem).
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const path = request.nextUrl.pathname
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(p + '/'))

  // redirect zachowujący odświeżone cookies sesji
  const go = (pathname: string) => {
    const url = request.nextUrl.clone()
    url.pathname = pathname
    url.search = ''
    const r = NextResponse.redirect(url)
    response.cookies.getAll().forEach((c) => r.cookies.set(c))
    return r
  }

  // zalogowany na ekranie logowania/rejestracji → feed
  if (user && AUTH_PAGES.includes(path)) return go('/feed')
  // niezalogowany na chronionej trasie → login
  if (!user && isProtected) return go('/login')
  // zalogowany bez onboardingu → onboarding (C4 przeniesie stan na konto)
  if (user && isProtected && path !== '/onboarding' && !request.cookies.get('dropfeed_onboarded')) {
    return go('/onboarding')
  }
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
