/**
 * Dzienny snapshot sprzedaży TikTok Shop (jak FB brand_daily_snapshot).
 *
 * BOUNDED: scrapuje TYLKO nasz zestaw (produkty już w tiktok_shop_products),
 * NIE całe TikTok Shop. Jeden run Apify (scrapeType=product, wszystkie URL-e na
 * raz) → odświeża sales_volume/exact_sold + wpisuje wiersz do tiktok_shop_snapshot
 * (product_id, current_date, sales_volume). Trend/sparkline + wzrost% liczy potem
 * RPC tiktok_shop_bestsellers ze snapshotów (≥2 dni).
 *
 * Koszt = jeden dzienny scrape naszej listy (~$0.003/produkt zmierzone).
 * Uruchamianie: npm run tiktok:snapshot [-- --limit N]   (N produktów, do testów)
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
const li = process.argv.indexOf('--limit')
const LIMIT = li !== -1 ? parseInt(process.argv[li + 1], 10) : Infinity

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE!, { auth: { persistSession: false, autoRefreshToken: false } })
const ACTOR = 'pro100chok~tiktok-shop-scraper-usage'
const toInt = (x: unknown) => { const n = parseInt(String(x ?? '').replace(/[^0-9]/g, ''), 10); return Number.isFinite(n) ? n : null }
const toNum = (x: unknown) => { const n = Number(x); return Number.isFinite(n) ? n : null }

async function main() {
  // 1) nasz zestaw — produkty z URL-em (bounded, NIE całe TikTok Shop)
  let q = supabase.from('tiktok_shop_products').select('product_id,product_url').eq('region', 'us').not('product_url', 'is', null)
  if (LIMIT !== Infinity) q = q.limit(LIMIT)
  const { data: rows, error: re } = await q
  if (re) { console.error('✗ products:', re.message); process.exit(1) }
  const set = (rows as { product_id: string; product_url: string }[]) ?? []
  if (!set.length) { console.log('Brak produktów do snapshotu.'); return }
  console.log(`Snapshot zestawu: ${set.length} produktów`)

  // 2) jeden run Apify — scrapeType=product dla całej listy
  const runRes = await fetch(`https://api.apify.com/v2/acts/${ACTOR}/runs?token=${APIFY_TOKEN}`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ scrapeType: 'product', productUrls: set.map((r) => r.product_url), region: 'us' }),
  })
  if (!runRes.ok) { console.error('✗ Apify start:', runRes.status, await runRes.text()); process.exit(1) }
  const run = (await runRes.json()).data as { id: string; defaultDatasetId: string }

  // poll (do 20 min)
  let status = 'RUNNING'
  for (let i = 0; i < 240; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    const st = await (await fetch(`https://api.apify.com/v2/actor-runs/${run.id}?token=${APIFY_TOKEN}`)).json()
    status = st.data.status
    process.stdout.write(`\r  status: ${status}   `)
    if (status !== 'RUNNING' && status !== 'READY') break
  }
  console.log('')
  if (status !== 'SUCCEEDED') { console.error('✗ Apify run nie SUCCEEDED:', status); process.exit(1) }

  // 3) dataset → mapowanie po productId
  const items: Record<string, unknown>[] = []
  for (let offset = 0; ; offset += 1000) {
    const batch = await (await fetch(`https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?token=${APIFY_TOKEN}&offset=${offset}&limit=1000`)).json() as Record<string, unknown>[]
    items.push(...batch)
    if (batch.length < 1000) break
  }
  console.log(`Pobrano ${items.length} pozycji`)

  // 4) odśwież produkty + zbierz snapshoty (metryka: salesVolume — spójna z baseline listy)
  const today = new Date().toISOString().slice(0, 10)
  const snaps: { product_id: string; day: string; sales_volume: number }[] = []
  let updated = 0
  for (const it of items) {
    const pid = String(it.productId ?? '')
    if (!pid) continue
    const sales = toInt(it.salesVolume) ?? toInt(it.exactSoldCount)
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (sales != null) patch.sales_volume = sales
    if (toInt(it.exactSoldCount) != null) patch.exact_sold_count = toInt(it.exactSoldCount)
    if (toInt(it.soldLast30Days) != null) patch.sold_last_30 = toInt(it.soldLast30Days)
    if (toNum(it.currentPrice) != null) patch.current_price = toNum(it.currentPrice)
    if (toNum(it.rating) != null) patch.rating = toNum(it.rating)
    if (toInt(it.reviewCount) != null) patch.review_count = toInt(it.reviewCount)
    if (toInt(it.shopFollowers) != null) patch.shop_followers = toInt(it.shopFollowers)
    if (toInt(it.shopTotalSold) != null) patch.shop_total_sold = toInt(it.shopTotalSold)
    if (toInt(it.shopVideoCount) != null) patch.shop_video_count = toInt(it.shopVideoCount)
    const { error } = await supabase.from('tiktok_shop_products').update(patch).eq('product_id', pid)
    if (!error) updated++
    if (sales != null) snaps.push({ product_id: pid, day: today, sales_volume: sales })
  }
  console.log(`Zaktualizowano ${updated} produktów`)

  // 5) upsert snapshotów na dziś (idempotentne — ponowny run tego samego dnia nadpisuje)
  if (snaps.length) {
    for (let i = 0; i < snaps.length; i += 500) {
      const { error } = await supabase.from('tiktok_shop_snapshot').upsert(snaps.slice(i, i + 500), { onConflict: 'product_id,day' })
      if (error) { console.error('✗ snapshot upsert:', error.message); process.exit(1) }
    }
  }
  console.log(`Snapshot ${today}: ${snaps.length} wierszy`)

  // 6) koszt runu
  const fin = await (await fetch(`https://api.apify.com/v2/actor-runs/${run.id}?token=${APIFY_TOKEN}`)).json()
  console.log(`Koszt runu: $${fin.data?.usageTotalUsd ?? '?'}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
