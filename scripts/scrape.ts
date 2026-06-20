/**
 * Codzienny dopływ nowych reklam (Część 2). Run Apify PER KRAJ (tagowanie marketu),
 * rotacja nisz×rynków między dniami.
 *
 * scrape_config.rotation_group: 0=codziennie (PL), 1=parzysty dzień (US,DE,ES),
 * 2=nieparzysty (UK,FR). Dzień wybierany po parzystości dnia miesiąca (UTC).
 * SCRAPE_DEPTH (4) = ile reklam per słowo (limitPerSource); count kraju =
 * liczba_słów × DEPTH. Głębokość, nie liczba słów, jest dźwignią świeżości
 * (płytko = codziennie te same top-reklamy; głębiej = więcej NOWYCH).
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
// GŁĘBOKOŚĆ per słowo kluczowe = limitPerSource. To jest dźwignia świeżości:
// płytko (≈2) zwraca codziennie te same „top” reklamy (~85% duplikatów); głębiej
// sięga dalej w wyniki = znacznie więcej NOWYCH. Koszt ~liniowy (~$0.0008/reklama).
// depth=4 ≈ 150–200 nowych/dzień, ~$13/mc scrape (mieści się w Apify STARTER $29
// obok brand:totals ~$11 + TikTok ~$0.18). Strojalne przez SCRAPE_DEPTH.
const DEPTH = parseInt(env.SCRAPE_DEPTH ?? '4', 10)
const ACTOR = 'curious_coder~facebook-ads-library-scraper'

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE!, { auth: { persistSession: false, autoRefreshToken: false } })

const searchUrl = (q: string, cc: string) =>
  `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${cc}&q=${encodeURIComponent(q)}&search_type=keyword_unordered&media_type=all`

async function runCountry(country: string, queries: string[], count: number): Promise<boolean> {
  const input = {
    urls: queries.map((q) => ({ url: searchUrl(q, country) })),
    count, limitPerSource: Math.max(2, Math.ceil(count / queries.length)), scrapeAdDetails: true,
  }
  const res = await fetch(`https://api.apify.com/v2/acts/${ACTOR}/runs?token=${APIFY_TOKEN}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input),
  })
  if (!res.ok) { console.error(`✗ ${country} Apify start:`, res.status, await res.text()); return false }
  const run = (await res.json()).data as { id: string; defaultDatasetId: string }

  let status = 'RUNNING'
  for (let i = 0; i < 180; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    status = (await (await fetch(`https://api.apify.com/v2/actor-runs/${run.id}?token=${APIFY_TOKEN}`)).json()).data.status
    if (status !== 'RUNNING' && status !== 'READY') break
  }
  if (status !== 'SUCCEEDED') { console.error(`✗ ${country} run:`, status); return false }

  const ing = await fetch(`${SUPABASE_URL}/functions/v1/ingest`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-webhook-secret': INGEST_WEBHOOK_SECRET! },
    body: JSON.stringify({ eventType: 'ACTOR.RUN.SUCCEEDED', resource: { defaultDatasetId: run.defaultDatasetId }, country }),
  })
  console.log(`  ${country}: ${ing.ok ? await ing.text() : 'ingest ' + ing.status}`)
  return ing.ok
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
  // Alokacja oparta na GŁĘBOKOŚCI: każde słowo dostaje DEPTH reklam (limitPerSource),
  // więc count kraju = liczba_słów × DEPTH. Więcej słów = naturalnie więcej budżetu.
  const target = [...byCountry.values()].reduce((s, q) => s + q.length * DEPTH, 0)
  console.log(`Dzień ${new Date().getUTCDate()} (grupa ${dayGroup}); kraje: ${[...byCountry.keys()].join(', ')}; depth=${DEPTH}; cel≈${target} reklam`)

  let ok = 0
  for (const [cc, queries] of byCountry) {
    const cnt = queries.length * DEPTH
    console.log(`→ ${cc}: ${queries.length} słów × ${DEPTH} = count=${cnt}`)
    if (await runCountry(cc, queries, cnt)) ok++
  }
  // Twardy błąd, gdy WSZYSTKIE kraje padły (np. „Monthly usage hard limit exceeded")
  // — inaczej workflow świeci na zielono mimo zerowego ingestu (cichy fail z 06-15/16).
  if (ok === 0) { console.error(`✗ Scrape: 0/${byCountry.size} krajów udanych — feed bez nowych reklam.`); process.exit(1) }
  console.log(`Scrape OK: ${ok}/${byCountry.size} krajów`)
}

main().catch((e) => { console.error(e); process.exit(1) })
