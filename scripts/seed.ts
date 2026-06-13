/**
 * Seed Supabase z danymi mockowymi (Etap 1, krok 2).
 *
 * Wgrywa brands → products → ads (kolejność wymuszona kluczami obcymi).
 * IDEMPOTENTNY: każdy wiersz dostaje deterministyczny UUID (v5) wyliczony
 * z mockowego id ('b1', 'p1', 'ad-b1-1'), więc ponowne uruchomienie robi
 * UPSERT (onConflict: 'id') zamiast duplikować.
 *
 * Uruchamianie: `npm run seed` (Node ≥23 strippuje typy natywnie).
 * Wymaga SUPABASE_SERVICE_ROLE_KEY w .env.local (server-side, omija RLS).
 *
 * Service_role key NIGDY nie trafia do kodu klienckiego ani do NEXT_PUBLIC_*.
 */

import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { brands, products, ads } from '../lib/data/mock.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// ─── Wczytanie .env.local (bez zależności) ─────────────────────────────────
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  let raw: string
  try {
    raw = readFileSync(resolve(root, '.env.local'), 'utf8')
  } catch {
    return env
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    env[key] = value
  }
  return env
}

const env = { ...loadEnv(), ...process.env }
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  console.error('✗ Brak NEXT_PUBLIC_SUPABASE_URL w .env.local')
  process.exit(1)
}
if (!SERVICE_ROLE_KEY) {
  console.error(
    '✗ Brak SUPABASE_SERVICE_ROLE_KEY.\n' +
      '  Wklej go w .env.local (Supabase → Project Settings → API Keys → service_role).\n' +
      '  To klucz server-side — NIE dawaj mu prefiksu NEXT_PUBLIC_ i nie commituj.',
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// ─── Deterministyczny UUID v5 z mockowego id ───────────────────────────────
// Namespace losowy, stały dla projektu — gwarantuje powtarzalne id między runami.
const NAMESPACE = 'b8c0f4e2-1a3d-4f7b-9c2e-6d5a8f0b1c3d'

function uuidv5(name: string): string {
  const nsBytes = Buffer.from(NAMESPACE.replace(/-/g, ''), 'hex')
  const hash = createHash('sha1')
    .update(nsBytes)
    .update(Buffer.from(name, 'utf8'))
    .digest()
  const bytes = hash.subarray(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x50 // wersja 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // wariant RFC 4122
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const id = (mockId: string) => uuidv5(mockId)

// ─── Mapowanie mock → wiersze DB (snake_case kolumny) ──────────────────────
const brandRows = brands.map((b) => ({
  id: id(b.id),
  name: b.name,
  fb_page_id: b.fbPageId ?? null,
  ig_handle: b.igHandle ?? null,
  ig_followers: b.igFollowers ?? null,
  store_url: b.storeUrl ?? null,
  country: b.country ?? null,
  avatar_initials: b.avatarInitials,
}))

const productRows = products.map((p) => ({
  id: id(p.id),
  brand_id: id(p.brandId),
  name: p.name,
  offer_type: p.offerType,
  niche: p.niche,
  category: p.category,
  price_in_store: p.priceInStore ?? null,
  offer_url: p.offerUrl ?? null,
  thumbnail: p.thumbnail ?? null,
  confidence: p.confidence,
}))

const adRows = ads.map((a) => ({
  id: id(a.id),
  ad_archive_id: null,
  brand_id: id(a.brandId),
  product_id: a.productId ? id(a.productId) : null,
  format: a.format,
  creative_url: a.creativeUrl,
  thumb_url: a.creativeUrl, // mock: grafika picsum służy też za poster
  angle: a.angle ?? null,
  hook: a.hook ?? null,
  copy: a.copy ?? null,
  cta: a.cta ?? null,
  start_date: a.startDate,
  is_active: a.isActive,
  countries: a.countries,
  heat_score: a.heatScore,
  ad_variants_count: a.adVariantsCount,
  scaling_since: a.scalingSince ?? null,
  offer_type: a.offerType,
  confidence: a.confidence,
  age_in_days: a.ageInDays,
  new_variants_last_14_days: a.newVariantsLast14Days,
}))

// ─── Upsert w kolejności FK ────────────────────────────────────────────────
async function upsert(table: string, rows: unknown[]) {
  const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' })
  if (error) {
    console.error(`✗ ${table}: ${error.message}`)
    process.exit(1)
  }
  console.log(`✓ ${table}: ${rows.length} wierszy`)
}

async function main() {
  console.log(`Seed → ${SUPABASE_URL}`)
  await upsert('brands', brandRows)
  await upsert('products', productRows)
  await upsert('ads', adRows)

  const { count } = await supabase
    .from('ads')
    .select('*', { count: 'exact', head: true })
  console.log(`\n✓ Gotowe. Łącznie reklam w bazie: ${count ?? '?'}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
