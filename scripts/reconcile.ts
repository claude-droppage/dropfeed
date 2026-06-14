/**
 * Reconcile żywotności reklam + snapshot osi skalowania (FAZA B, co 2 tyg.).
 *
 * Per-marka re-scrape Ad Library (view_all_page_id) — zwraca AKTUALNIE aktywne
 * reklamy strony. Stąd:
 *  - nasze reklamy marki w zbiorze → is_active=true, last_seen_at=now
 *  - nasze reklamy marki POZA zbiorem → is_active=false, deactivated_at=now
 *  - brand_daily_snapshot: prawdziwa liczba aktywnych reklam marki (z FB)
 *
 * Jeden run Apify dla wszystkich marek (urls=lista page'y). scrapeAdDetails=false
 * (potrzebujemy tylko ad_archive_id + page_id → taniej).
 *
 * Uruchamianie: npm run reconcile [-- --limit N]   (N marek, do testów)
 * Sekrety: APIFY_TOKEN + SUPABASE_SERVICE_ROLE_KEY z .env.local.
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
const ACTOR = 'curious_coder~facebook-ads-library-scraper'
const pageUrl = (pid: string) =>
  `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=PL&view_all_page_id=${pid}`

async function chunkUpdate(adIds: string[], patch: Record<string, unknown>) {
  for (let i = 0; i < adIds.length; i += 200) {
    const { error } = await supabase.from('ads').update(patch).in('ad_archive_id', adIds.slice(i, i + 200))
    if (error) { console.error('✗ update ads:', error.message); process.exit(1) }
  }
}

async function main() {
  // 1) marki do sprawdzenia
  let q = supabase.from('brands').select('id,fb_page_id').not('fb_page_id', 'is', null)
  if (LIMIT !== Infinity) q = q.limit(LIMIT)
  const { data: brands, error: be } = await q
  if (be) { console.error('✗ brands:', be.message); process.exit(1) }
  const pages = (brands as { id: string; fb_page_id: string }[])
  if (!pages.length) { console.log('Brak marek.'); return }
  console.log(`Reconcile marek: ${pages.length}`)

  // 2) jeden run Apify dla wszystkich page'y (tylko ad_archive_id + page_id)
  const input = {
    urls: pages.map((p) => ({ url: pageUrl(p.fb_page_id) })),
    count: Math.max(50, pages.length * 50),
    limitPerSource: 50,
    scrapeAdDetails: false,
  }
  console.log('Start Apify run…')
  const runRes = await fetch(`https://api.apify.com/v2/acts/${ACTOR}/runs?token=${APIFY_TOKEN}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input),
  })
  if (!runRes.ok) { console.error('✗ Apify start:', runRes.status, await runRes.text()); process.exit(1) }
  const run = (await runRes.json()).data as { id: string; defaultDatasetId: string }

  // poll
  let status = 'RUNNING'
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    const st = await (await fetch(`https://api.apify.com/v2/actor-runs/${run.id}?token=${APIFY_TOKEN}`)).json()
    status = st.data.status
    process.stdout.write(`\r  status: ${status}   `)
    if (status !== 'RUNNING' && status !== 'READY') break
  }
  console.log('')
  if (status !== 'SUCCEEDED') { console.error('✗ Apify run nie SUCCEEDED:', status); process.exit(1) }

  // 3) pobierz dataset (stronicowanie) → zbiór aktywnych ad_archive_id per page_id
  const byPage = new Map<string, Set<string>>()
  for (let offset = 0; ; offset += 1000) {
    const items = await (await fetch(`https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?token=${APIFY_TOKEN}&clean=true&offset=${offset}&limit=1000`)).json() as Record<string, unknown>[]
    for (const it of items) {
      const snap = (it.snapshot ?? {}) as Record<string, unknown>
      const pid = (snap.page_id as string) ?? (it.page_id as string)
      const aid = it.ad_archive_id as string
      if (!pid || !aid) continue
      if (!byPage.has(pid)) byPage.set(pid, new Set())
      byPage.get(pid)!.add(aid)
    }
    if (items.length < 1000) break
  }
  console.log(`Pobrano aktywne reklamy dla ${byPage.size} stron`)

  // 4) nasze reklamy tych marek
  const brandIds = pages.map((p) => p.id)
  const ours: { ad_archive_id: string; brand_id: string; is_active: boolean }[] = []
  for (let i = 0; i < brandIds.length; i += 300) {
    const { data, error } = await supabase.from('ads').select('ad_archive_id,brand_id,is_active').in('brand_id', brandIds.slice(i, i + 300))
    if (error) { console.error('✗ ads:', error.message); process.exit(1) }
    ours.push(...(data as typeof ours))
  }
  const pidByBrand = new Map(pages.map((p) => [p.id, p.fb_page_id]))

  // 5) wyznacz zmiany
  const nowIso = new Date().toISOString()
  const stillActive: string[] = []   // widziane → potwierdź aktywne
  const wentDead: string[] = []      // były aktywne, brak w scrape → martwe
  for (const ad of ours) {
    const pid = pidByBrand.get(ad.brand_id)
    const seen = pid ? byPage.get(pid)?.has(ad.ad_archive_id) ?? false : false
    if (seen) stillActive.push(ad.ad_archive_id)
    else if (ad.is_active) wentDead.push(ad.ad_archive_id)
  }
  await chunkUpdate(stillActive, { is_active: true, last_seen_at: nowIso, deactivated_at: null })
  await chunkUpdate(wentDead, { is_active: false, deactivated_at: nowIso })

  // 6) snapshot osi skalowania (prawdziwa liczba aktywnych reklam/markę z FB)
  const day = nowIso.slice(0, 10)
  const snapshots = pages.map((p) => ({
    brand_id: p.id, day, active_ads_count: byPage.get(p.fb_page_id)?.size ?? 0,
  }))
  for (let i = 0; i < snapshots.length; i += 500) {
    const { error } = await supabase.from('brand_daily_snapshot').upsert(snapshots.slice(i, i + 500), { onConflict: 'brand_id,day' })
    if (error) { console.error('✗ snapshot:', error.message); process.exit(1) }
  }

  console.log(`\n✓ Reconcile: potwierdzone aktywne ${stillActive.length}, oznaczone martwe ${wentDead.length}, snapshoty ${snapshots.length}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
