/**
 * Dzienny snapshot zwycięzców FB (Część 2) — PO scrape, BEZ dodatkowego scrape'a.
 * Woła RPC snapshot_product_winners() (liczy top-10 z product_winners i zapisuje
 * wiersze dnia do products_daily_winners). Zero kosztu Apify — czysta kalkulacja.
 *
 * Uruchamianie: npm run winners:snapshot
 * Sekrety: SUPABASE_SERVICE_ROLE_KEY z .env.local / GH Actions.
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  try {
    for (const line of readFileSync(resolve(root, '.env.local'), 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq > 0) env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
    }
  } catch { /* CI */ }
  return env
}
const env = { ...loadEnv(), ...process.env }
const { NEXT_PUBLIC_SUPABASE_URL: URL, SUPABASE_SERVICE_ROLE_KEY: KEY } = env
if (!URL || !KEY) { console.error('✗ Brak SUPABASE_URL / SERVICE_ROLE_KEY'); process.exit(1) }

const supabase = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const { data, error } = await supabase.rpc('snapshot_product_winners')
if (error) { console.error('✗ snapshot_product_winners:', error.message); process.exit(1) }
console.log(`✓ Zwycięzcy dnia zapisani: ${data} wierszy`)
