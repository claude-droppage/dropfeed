import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Brak konfiguracji Supabase. Ustaw NEXT_PUBLIC_SUPABASE_URL i ' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY w .env.local (skopiuj z panelu Supabase).',
  )
}

/**
 * Przeglądarkowy klient Supabase (anon key, ograniczony przez RLS).
 * Bezpieczny do użycia w komponentach klienckich.
 * Do operacji server-side omijających RLS (pipeline w Etapie 1) utworzymy
 * osobny klient z SUPABASE_SERVICE_ROLE_KEY.
 */
export const supabase = createClient(url, anonKey)
