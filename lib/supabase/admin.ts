import { createClient } from '@supabase/supabase-js'

/**
 * Service-role klient Supabase — SERWER ONLY. Zapis treści ShopRadar (produkty,
 * snapshoty, twórcy) omija RLS. NIGDY nie importować w komponencie klienckim.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
