import { createBrowserClient } from '@supabase/ssr'

/**
 * Przeglądarkowy klient Supabase (auth + odczyt przez RLS) — komponenty klienckie.
 * Trzyma sesję w cookies (zgodnie z @supabase/ssr), więc współgra z proxy/SSR.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
