/**
 * Odczyt nagłówka „X active ads" per marka (zastępuje biweekly reconcile).
 *
 * FB pokazuje total aktywnych reklam reklamodawcy WPROST (pole `total` na każdym
 * itemie strony marki) — nie trzeba liczyć przez pełny re-scrape. Bierzemy tylko
 * KANDYDATÓW (brand_total_candidates, cap 40, priorytet wg znanej liczby reklam),
 * JEDEN run Apify (view_all_page_id, country=ALL, limitPerSource=1, count PUSTY),
 * czytamy `total` per page_id, upsert do brand_active_total. Cache 7 dni.
 * Koszt ~$0.018/markę (aktor i tak ściąga ~1 stronę reklam/URL) — i tak ~4× taniej
 * niż reconcile (tylko kandydaci, nie wszystkie 320 marek; cache 7d).
 *
 * Uruchamianie: npm run brand:totals
 * Sekrety: APIFY_TOKEN + SUPABASE_SERVICE_ROLE_KEY.
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
      const t = line.trim(); if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('='); if (eq > 0) env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
    }
  } catch { /* CI */ }
  return env
}
const env = { ...loadEnv(), ...process.env }
const { NEXT_PUBLIC_SUPABASE_URL: URL, SUPABASE_SERVICE_ROLE_KEY: KEY, APIFY_TOKEN } = env
for (const [k, v] of Object.entries({ URL, KEY, APIFY_TOKEN })) { if (!v) { console.error(`✗ Brak ${k}`); process.exit(1) } }

const supabase = createClient(URL!, KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
const ACTOR = 'curious_coder~facebook-ads-library-scraper'
const CAP = 40
const pageUrl = (pid: string) =>
  `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=ALL&view_all_page_id=${pid}`
const toInt = (x: unknown) => { const n = parseInt(String(x ?? '').replace(/[^0-9]/g, ''), 10); return Number.isFinite(n) ? n : null }

async function main() {
  const { data: cand, error } = await supabase.rpc('brand_total_candidates', { p_limit: CAP })
  if (error) { console.error('✗ candidates:', error.message); process.exit(1) }
  const list = (cand as { brand_id: string; page_id: string }[]) ?? []
  if (!list.length) { console.log('Brak kandydatów do odświeżenia (wszyscy świeży).'); return }
  console.log(`Kandydatów: ${list.length}`)

  // jeden run: limitPerSource ad/markę, `total` per page_id. count PUSTY (inaczej
  // globalnie capuje i zżera budżet na pierwszych stronach). Min 10 wyników łącznie
  // (wymóg aktora) → przy małej liście podbij limitPerSource.
  const perSrc = list.length >= 10 ? 1 : Math.ceil(10 / list.length)
  const input = {
    urls: list.map((c) => ({ url: pageUrl(c.page_id) })),
    limitPerSource: perSrc, scrapeAdDetails: false,
  }
  const runRes = await fetch(`https://api.apify.com/v2/acts/${ACTOR}/runs?token=${APIFY_TOKEN}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input),
  })
  if (!runRes.ok) { console.error('✗ Apify start:', runRes.status, await runRes.text()); process.exit(1) }
  const run = (await runRes.json()).data as { id: string; defaultDatasetId: string }

  let status = 'RUNNING'
  for (let i = 0; i < 180; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    status = (await (await fetch(`https://api.apify.com/v2/actor-runs/${run.id}?token=${APIFY_TOKEN}`)).json()).data.status
    process.stdout.write(`\r  ${status}   `)
    if (status !== 'RUNNING' && status !== 'READY') break
  }
  console.log('')
  if (status !== 'SUCCEEDED') { console.error('✗ run:', status); process.exit(1) }

  // total per page_id
  const byPage = new Map<string, number>()
  for (let offset = 0; ; offset += 1000) {
    const items = await (await fetch(`https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?token=${APIFY_TOKEN}&offset=${offset}&limit=1000`)).json() as Record<string, unknown>[]
    for (const it of items) {
      const pid = (it.page_id as string) ?? ((it.snapshot as Record<string, unknown>)?.page_id as string)
      const total = toInt(it.total)
      if (pid && total != null && !byPage.has(pid)) byPage.set(pid, total)
    }
    if (items.length < 1000) break
  }

  const nowIso = new Date().toISOString()
  const rows = list
    .filter((c) => byPage.has(c.page_id))
    .map((c) => ({ brand_id: c.brand_id, fb_total: byPage.get(c.page_id)!, page_id: c.page_id, fetched_at: nowIso }))
  for (let i = 0; i < rows.length; i += 200) {
    const { error: ue } = await supabase.from('brand_active_total').upsert(rows.slice(i, i + 200), { onConflict: 'brand_id' })
    if (ue) { console.error('✗ upsert:', ue.message); process.exit(1) }
  }

  const fin = await (await fetch(`https://api.apify.com/v2/actor-runs/${run.id}?token=${APIFY_TOKEN}`)).json()
  console.log(`Zapisano total dla ${rows.length}/${list.length} marek · koszt $${fin.data?.usageTotalUsd ?? '?'}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
