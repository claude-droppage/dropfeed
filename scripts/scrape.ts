/**
 * Codzienny dopływ nowych reklam (Część 2). Run Apify PER KRAJ (tagowanie marketu),
 * wagi 80/20, rotacja nisz×rynków między dniami.
 *
 * scrape_config.rotation_group: 0=codziennie (PL), 1=parzysty dzień (US,DE,ES),
 * 2=nieparzysty (UK,FR). Dzień wybierany po parzystości dnia miesiąca (UTC).
 * SCRAPE_COUNT (200) dzielony między kraje dnia wg wag (PL > EN > secondary).
 * Po każdym runie woła ingest z parametrem country → raw_ads.country.
 *
 * Env: APIFY_TOKEN, SUPABASE_*, INGEST_WEBHOOK_SECRET.
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
const { NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE,
  APIFY_TOKEN, INGEST_WEBHOOK_SECRET } = env
for (const [k, v] of Object.entries({ SUPABASE_URL, SERVICE_ROLE, APIFY_TOKEN, INGEST_WEBHOOK_SECRET })) {
  if (!v) { console.error(`✗ Brak ${k}`); process.exit(1) }
}
const COUNT = parseInt(env.SCRAPE_COUNT ?? '200', 10)
const ACTOR = 'curious_coder~facebook-ads-library-scraper'
// wagi alokacji count per kraj (~80/20 main/secondary) — strojalne
const WEIGHT: Record<string, number> = { PL: 4, US: 3, UK: 3, DE: 1, FR: 1, ES: 1 }

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE!, { auth: { persistSession: false, autoRefreshToken: false } })

const searchUrl = (q: string, cc: string) =>
  `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${cc}&q=${encodeURIComponent(q)}&search_type=keyword_unordered&media_type=all`

async function runCountry(country: string, queries: string[], count: number) {
  const input = {
    urls: queries.map((q) => ({ url: searchUrl(q, country) })),
    count, limitPerSource: Math.max(2, Math.ceil(count / queries.length)), scrapeAdDetails: true,
  }
  const res = await fetch(`https://api.apify.com/v2/acts/${ACTOR}/runs?token=${APIFY_TOKEN}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input),
  })
  if (!res.ok) { console.error(`✗ ${country} Apify start:`, res.status, await res.text()); return }
  const run = (await res.json()).data as { id: string; defaultDatasetId: string }

  let status = 'RUNNING'
  for (let i = 0; i < 180; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    status = (await (await fetch(`https://api.apify.com/v2/actor-runs/${run.id}?token=${APIFY_TOKEN}`)).json()).data.status
    if (status !== 'RUNNING' && status !== 'READY') break
  }
  if (status !== 'SUCCEEDED') { console.error(`✗ ${country} run:`, status); return }

  const ing = await fetch(`${SUPABASE_URL}/functions/v1/ingest`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-webhook-secret': INGEST_WEBHOOK_SECRET! },
    body: JSON.stringify({ eventType: 'ACTOR.RUN.SUCCEEDED', resource: { defaultDatasetId: run.defaultDatasetId }, country }),
  })
  console.log(`  ${country}: ${ing.ok ? await ing.text() : 'ingest ' + ing.status}`)
}

async function main() {
  // rotacja: dzień parzysty → grupa 1, nieparzysty → grupa 2; grupa 0 zawsze (PL)
  const dayGroup = new Date().getUTCDate() % 2 === 0 ? 1 : 2
  const { data, error } = await supabase
    .from('scrape_config')
    .select('query,country,rotation_group')
    .eq('is_active', true)
    .eq('source', 'meta_ad_library')
    .in('rotation_group', [0, dayGroup])
  if (error) { console.error('✗ scrape_config:', error.message); process.exit(1) }
  const cfgs = (data as { query: string; country: string; rotation_group: number }[]).filter((c) => c.query)
  if (!cfgs.length) { console.error('✗ Brak konfiguracji dla dnia'); process.exit(1) }

  // grupuj po kraju
  const byCountry = new Map<string, string[]>()
  for (const c of cfgs) {
    const cc = c.country || 'PL'
    if (!byCountry.has(cc)) byCountry.set(cc, [])
    byCountry.get(cc)!.push(c.query)
  }
  const totalW = [...byCountry.keys()].reduce((s, cc) => s + (WEIGHT[cc] ?? 1), 0)
  console.log(`Dzień ${new Date().getUTCDate()} (grupa ${dayGroup}); kraje: ${[...byCountry.keys()].join(', ')}; count=${COUNT}`)

  for (const [cc, queries] of byCountry) {
    const cnt = Math.max(10, Math.round((COUNT * (WEIGHT[cc] ?? 1)) / totalW))
    console.log(`→ ${cc}: ${queries.length} słów, count=${cnt}`)
    await runCountry(cc, queries, cnt)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
