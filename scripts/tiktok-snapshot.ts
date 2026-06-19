/**
 * Dzienny silnik Propozycji TikTok Shop (rdzeń produktu).
 *
 * Jeden best_sellers scrape per kategoria (region=us) = DISCOVERY + SNAPSHOT + RANK:
 *  • upsert tiktok_shop_products po product_id: istniejący → update sold/price/rank/
 *    last_seen_at (+ un-archive); nowy → insert + tracking_started_at=dziś (default).
 *  • snapshot: (product_id, day, sales_volume, rank, category) — rank-delta to PRIMARY
 *    sygnał ruchu (searchRank = momentum TikToka, odporny na zaokrąglenie). salesVolume
 *    = lifetime sztuki (dokładne) → velocity sztukowe tylko bezwzględne, NIE % od totalu.
 *  • niewidziany >14 dni → archived=true (zostaje z historią, wypada z dziennego scrape).
 *
 * Aktor bywa flaky w search (zwraca 0) → retry per kategoria. Koszt = jeden tani scrape
 * listy/dzień (~$0.0002/szt zmierzone). NIE usuwamy produktów. USA only.
 *
 * Uruchamianie: npm run tiktok:snapshot
 * Sekrety: APIFY_TOKEN + SUPABASE_SERVICE_ROLE_KEY z .env.local / GH Actions.
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
  } catch { /* brak */ }
  return env
}
const env = { ...loadEnv(), ...process.env }
const { NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE, APIFY_TOKEN } = env
for (const [k, v] of Object.entries({ SUPABASE_URL, SERVICE_ROLE, APIFY_TOKEN })) {
  if (!v) { console.error(`✗ Brak ${k} w .env.local`); process.exit(1) }
}

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE!, { auth: { persistSession: false, autoRefreshToken: false } })
const ACTOR = 'pro100chok~tiktok-shop-scraper-usage'
// kategorie = nasz aktywny zestaw (te same query co przy seedzie T2). USA only.
const CATEGORIES = ['beauty', 'kitchen', 'gadgets', 'home', 'tumbler']
const MAX_PER_CAT = 25
const ARCHIVE_AFTER_DAYS = 14

// Wykluczenie kategorii konsumpcyjnych (Część C) — źródło prawdy listy słów.
// Mirror w migracji 0020 (backfill) + CLAUDE.md. Dopasowanie po tytule (US → EN+PL).
// prefix-match (łapie polską fleksję: „kolagenu", „kremu"). Mirror SQL: is_excluded_title (migr. 0024).
const EXCL_RE = /\b(cream|serum|ointment|balm|lotion|supplement|vitamin|collagen|capsule|gummies|gummy|skincare|krem|maść|masc|balsam|suplement|witamin|kolagen|bronzer|sunscreen|sunblock)|face ?mask|self[ -]?tan|samoopalacz|samoopalaj|przeciws[lł]oneczn|after[ -]?sun|\bspf|sonnenschutz|sonnencreme|selbstbr[äa]uner|cr[èe]me solaire|autobronzant|protector solar|autobronceador/i
const isExcluded = (title: string | null) => EXCL_RE.test((title || '').toLowerCase())

const toInt = (x: unknown) => { const n = parseInt(String(x ?? '').replace(/[^0-9]/g, ''), 10); return Number.isFinite(n) ? n : null }
const toNum = (x: unknown) => { const n = Number(x); return Number.isFinite(n) ? n : null }
const img = (it: Record<string, unknown>) =>
  (Array.isArray(it.imageUrls) && it.imageUrls[0]) || it.productImageUrl || it.image_url || it.coverUrl || null

// start run + poll → { items, cost }
async function scrapeCategory(cat: string): Promise<{ items: Record<string, unknown>[]; cost: number }> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const runRes = await fetch(`https://api.apify.com/v2/acts/${ACTOR}/runs?token=${APIFY_TOKEN}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scrapeType: 'search', searchKeywords: [cat], sortBy: 'best_sellers', region: 'us', maxItems: MAX_PER_CAT }),
    })
    if (!runRes.ok) { console.error(`  ✗ ${cat} start:`, runRes.status); continue }
    const run = (await runRes.json()).data as { id: string; defaultDatasetId: string }
    let status = 'RUNNING'
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 5000))
      const st = await (await fetch(`https://api.apify.com/v2/actor-runs/${run.id}?token=${APIFY_TOKEN}`)).json()
      status = st.data.status
      if (status !== 'RUNNING' && status !== 'READY') break
    }
    const fin = (await (await fetch(`https://api.apify.com/v2/actor-runs/${run.id}?token=${APIFY_TOKEN}`)).json()).data
    const cost = Number(fin?.usageTotalUsd ?? 0)
    if (status !== 'SUCCEEDED') { console.error(`  ✗ ${cat} status ${status} (próba ${attempt})`); continue }
    const items: Record<string, unknown>[] = []
    for (let offset = 0; ; offset += 1000) {
      const batch = await (await fetch(`https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?token=${APIFY_TOKEN}&offset=${offset}&limit=1000`)).json() as Record<string, unknown>[]
      items.push(...batch)
      if (batch.length < 1000) break
    }
    if (items.length === 0 && attempt < 3) { console.error(`  ⟳ ${cat} zwrócił 0 — retry`); continue }
    console.log(`  ${cat}: ${items.length} pozycji ($${cost.toFixed(4)})`)
    return { items, cost }
  }
  console.error(`  ✗ ${cat}: brak danych po 3 próbach`)
  return { items: [], cost: 0 }
}

async function main() {
  const today = new Date().toISOString().slice(0, 10)
  const nowIso = new Date().toISOString()

  // 1) scrape per kategoria → najlepszy (min rank) wpis per produkt
  const best = new Map<string, { it: Record<string, unknown>; rank: number; cat: string }>()
  let totalCost = 0
  for (const cat of CATEGORIES) {
    const { items, cost } = await scrapeCategory(cat)
    totalCost += cost
    for (const it of items) {
      const pid = String(it.productId ?? '')
      const rank = toInt(it.searchRank) ?? 9999
      if (!pid) continue
      const prev = best.get(pid)
      if (!prev || rank < prev.rank) best.set(pid, { it, rank, cat })
    }
  }
  console.log(`Unikatowych produktów: ${best.size}`)
  if (best.size === 0) { console.error('✗ Zero produktów — nie ruszam zapisu (chronię zestaw).'); process.exit(1) }

  // 2) upsert produktów (un-archive widzianych) + zbierz snapshoty
  const products: Record<string, unknown>[] = []
  const snaps: Record<string, unknown>[] = []
  let excludedCount = 0
  for (const [pid, { it, rank, cat }] of best) {
    const sales = toInt(it.salesVolume) ?? toInt(it.exactSoldCount)
    const excl = isExcluded(it.title as string)
    if (excl) excludedCount++
    products.push({
      product_id: pid, region: 'us', query: cat, rank,
      title: (it.title as string) ?? null, image_url: img(it), product_url: (it.productUrl as string) ?? null,
      current_price: toNum(it.currentPrice ?? it.price), original_price: toNum(it.originalPrice),
      sales_volume: sales, rating: toNum(it.rating), review_count: toInt(it.reviewCount),
      seller_name: (it.sellerName as string) ?? null,
      last_seen_at: nowIso, archived: false, excluded: excl, updated_at: nowIso,
    })
    // wykluczone pomijamy w snapshocie (czysty aktywny zestaw, mniejszy koszt)
    if (sales != null && !excl) snaps.push({ product_id: pid, day: today, sales_volume: sales, rank, category: cat })
  }
  for (let i = 0; i < products.length; i += 200) {
    const { error } = await supabase.from('tiktok_shop_products').upsert(products.slice(i, i + 200), { onConflict: 'product_id' })
    if (error) { console.error('✗ upsert products:', error.message); process.exit(1) }
  }
  for (let i = 0; i < snaps.length; i += 500) {
    const { error } = await supabase.from('tiktok_shop_snapshot').upsert(snaps.slice(i, i + 500), { onConflict: 'product_id,day' })
    if (error) { console.error('✗ upsert snapshot:', error.message); process.exit(1) }
  }
  console.log(`Zaktualizowano/dodano ${products.length} produktów (${excludedCount} wykluczonych) · snapshot ${today}: ${snaps.length} wierszy`)

  // 3) archiwizacja zwietrzałych (niewidziane >14 dni)
  const cutoff = new Date(Date.now() - ARCHIVE_AFTER_DAYS * 86400_000).toISOString()
  const { data: arch, error: ae } = await supabase
    .from('tiktok_shop_products')
    .update({ archived: true }).eq('region', 'us').eq('archived', false).lt('last_seen_at', cutoff).select('product_id')
  if (ae) console.error('✗ archive:', ae.message)
  else console.log(`Zarchiwizowano (>${ARCHIVE_AFTER_DAYS}d niewidziane): ${arch?.length ?? 0}`)

  console.log(`KOSZT PRZEBIEGU: $${totalCost.toFixed(4)}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
