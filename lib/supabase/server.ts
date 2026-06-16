import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Serwerowy klient Supabase (Server Components / Route Handlers) — sesja z cookies.
 * cookies() jest async w Next 16. setAll w Server Component rzuca → łapiemy (proxy
 * i tak odświeża sesję), więc bezpieczne do czytania usera server-side.
 */
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // wywołane z Server Component — ignorujemy (proxy odświeża sesję)
          }
        },
      },
    },
  )
}
