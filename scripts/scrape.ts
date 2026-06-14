/**
 * Codzienny dopływ nowych reklam (FAZA B). Czyta scrape_config (aktywne nisze/
 * słowa), odpala broad-scrape Apify, po sukcesie wywołuje Edge Function `ingest`
 * (reuse dedup → raw_ads). Potem GH Action uruchamia enrich → rehost → logos.
 *
 * Uruchamianie: npm run scrape   (env: APIFY_TOKEN, SUPABASE_*, INGEST_WEBHOOK_SECRET)
 * SCRAPE_COUNT (domyślnie 200) — łączny dzienny limit reklam.
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
  } catch { /* brak (np. CI) */ }
  return env
}
const env = { ...loadEnv(), ...process.env }
const { NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE,
  APIFY_TOKEN, INGEST_WEBHOOK_SECRET } = env
for (const [k, v] of Object.entries({ SUPABASE_URL, SERVICE_ROLE, APIFY_TOKEN, INGEST_WEBHOOK_SECRET })) {
  if (!v) { console.error(`✗ Brak ${k}`); process.exit(1) }
}
const COUNT = parseInt(env.SCRAPE_COUNT ?? '200', 10)
const ACTOR = 'curious_coder~facebook-ads-library-scraper'

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE!, { auth: { persistSession: false, autoRefreshToken: false } })

function searchUrl(query: string, country: string): string {
  const q = encodeURIComponent(query)
  return `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${country}&q=${q}&search_type=keyword_unordered&media_type=all`
}

async function main() {
  // 1) aktywne konfiguracje scrape
  const { data, error } = await supabase
    .from('scrape_config')
    .select('query,country')
    .eq('is_active', true)
    .eq('source', 'meta_ad_library')
  if (error) { console.error('✗ scrape_config:', error.message); process.exit(1) }
  const cfgs = (data as { query: string; country: string }[]).filter((c) => c.query)
  if (!cfgs.length) { console.error('✗ Brak aktywnych scrape_config'); process.exit(1) }

  const urls = cfgs.map((c) => ({ url: searchUrl(c.query, c.country || 'PL') }))
  const limitPerSource = Math.max(5, Math.ceil(COUNT / urls.length))
  console.log(`Scrape: ${urls.length} słów, count=${COUNT}, limitPerSource=${limitPerSource}`)

  // 2) start Apify
  const input = { urls, count: COUNT, limitPerSource, scrapeAdDetails: true }
  const runRes = await fetch(`https://api.apify.com/v2/acts/${ACTOR}/runs?token=${APIFY_TOKEN}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input),
  })
  if (!runRes.ok) { console.error('✗ Apify start:', runRes.status, await runRes.text()); process.exit(1) }
  const run = (await runRes.json()).data as { id: string; defaultDatasetId: string }
  console.log(`Run ${run.id}…`)

  // 3) poll
  let status = 'RUNNING'
  for (let i = 0; i < 180; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    status = (await (await fetch(`https://api.apify.com/v2/actor-runs/${run.id}?token=${APIFY_TOKEN}`)).json()).data.status
    process.stdout.write(`\r  status: ${status}   `)
    if (status !== 'RUNNING' && status !== 'READY') break
  }
  console.log('')
  if (status !== 'SUCCEEDED') { console.error('✗ Run nie SUCCEEDED:', status); process.exit(1) }

  // 4) trigger ingest (reuse dedup → raw_ads)
  const ingestUrl = `${SUPABASE_URL}/functions/v1/ingest`
  const ing = await fetch(ingestUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-webhook-secret': INGEST_WEBHOOK_SECRET! },
    body: JSON.stringify({ eventType: 'ACTOR.RUN.SUCCEEDED', resource: { defaultDatasetId: run.defaultDatasetId } }),
  })
  const body = await ing.text()
  if (!ing.ok) { console.error('✗ ingest:', ing.status, body); process.exit(1) }
  console.log(`✓ ingest: ${body}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
