/**
 * IZOLOWANY pipeline: odkrywanie + weryfikacja organicznych sprzedawców TikTok
 * (bio → realny sklep Shopify). NIE dotyka FB scrape ani istniejących powierzchni.
 * Uruchamianie ręczne: npm run tiktok:sweep (NIE w daily.yml).
 *
 * Cz.2: sweep po seedach (clockworks/tiktok-scraper) → dedup autorów → najlepszy
 * filmik per autor. Cz.3-5 dokładają resolve bio / weryfikację / zapis / raport.
 *
 * Env: APIFY_TOKEN, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const env: Record<string, string> = {}
try { for (const l of readFileSync(resolve(root, '.env.local'), 'utf8').split('\n')) { const t = l.trim(); if (!t || t.startsWith('#')) continue; const e = t.indexOf('='); if (e > 0) env[t.slice(0, e).trim()] = t.slice(e + 1).trim() } } catch { /* CI */ }
const E = { ...env, ...process.env }
const supabase = createClient(E.NEXT_PUBLIC_SUPABASE_URL!, E.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
const TOKEN = E.APIFY_TOKEN!

// ── parametry (strojalne env) ────────────────────────────────────────────
const SEEDS_PER_RUN = parseInt(E.SEEDS_PER_RUN ?? '8', 10)
const MAX_VIDEOS_PER_SEED = parseInt(E.MAX_VIDEOS_PER_SEED ?? '120', 10)

const SWEEP_ACTOR = 'clockworks~tiktok-scraper'

async function apifyRun(act: string, input: unknown, ms = 600000): Promise<{ items: Record<string, unknown>[]; cost: number }> {
  const r = await fetch(`https://api.apify.com/v2/acts/${act}/runs?token=${TOKEN}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) })
  if (!r.ok) { console.error('✗ Apify start:', r.status, await r.text()); return { items: [], cost: 0 } }
  const run = (await r.json()).data as { id: string; defaultDatasetId: string }
  let st = 'RUNNING'
  for (let i = 0; i < ms / 5000; i++) { await new Promise((x) => setTimeout(x, 5000)); st = (await (await fetch(`https://api.apify.com/v2/actor-runs/${run.id}?token=${TOKEN}`)).json()).data.status; if (st !== 'RUNNING' && st !== 'READY') break }
  const fin = (await (await fetch(`https://api.apify.com/v2/actor-runs/${run.id}?token=${TOKEN}`)).json()).data
  if (fin?.status !== 'SUCCEEDED') console.error('✗ run status:', fin?.status)
  const items = await (await fetch(`https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?token=${TOKEN}&limit=5000`)).json() as Record<string, unknown>[]
  return { items: Array.isArray(items) ? items : [], cost: Number(fin?.usageTotalUsd ?? 0) }
}

export interface Author {
  handle: string
  signature: string
  bioLink: string
  sourceSeed: string
  bestVideoUrl: string
  bestCover: string
  bestPlayCount: number
  bestPostedAt: string | null
}

/** Sweep seedów → dedup autorów (najlepszy filmik = max playCount). */
async function sweep(seeds: string[]): Promise<{ authors: Map<string, Author>; videos: number; cost: number }> {
  const { items, cost } = await apifyRun(SWEEP_ACTOR, {
    hashtags: seeds, resultsPerPage: MAX_VIDEOS_PER_SEED,
    shouldDownloadVideos: false, shouldDownloadCovers: false, shouldDownloadSubtitles: false, shouldDownloadSlideshowImages: false,
  })
  const authors = new Map<string, Author>()
  for (const v of items) {
    const am = (v.authorMeta ?? {}) as Record<string, unknown>
    const handle = String(am.name ?? '')
    if (!handle) continue
    const pc = Number(v.playCount ?? 0)
    const vm = (v.videoMeta ?? {}) as Record<string, unknown>
    const cur = authors.get(handle)
    if (!cur || pc > cur.bestPlayCount) {
      const bio = am.bioLink && typeof am.bioLink === 'object' ? String((am.bioLink as Record<string, unknown>).link ?? '') : String(am.bioLink ?? '')
      authors.set(handle, {
        handle, signature: String(am.signature ?? ''), bioLink: bio,
        sourceSeed: String(v.searchHashtag ?? v.input ?? ''),
        bestVideoUrl: String(v.webVideoUrl ?? ''),
        bestCover: String(vm.coverUrl ?? vm.cover ?? vm.originCover ?? ''),
        bestPlayCount: pc, bestPostedAt: v.createTimeISO ? String(v.createTimeISO) : null,
      })
    }
  }
  return { authors, videos: items.length, cost }
}

async function main() {
  // seedy z rotacją: najdawniej użyte najpierw
  const { data } = await supabase.from('tiktok_organic_seeds').select('seed').eq('is_active', true).order('last_used_at', { ascending: true, nullsFirst: true }).limit(SEEDS_PER_RUN)
  const seeds = (data as { seed: string }[] ?? []).map((s) => s.seed)
  if (!seeds.length) { console.error('✗ Brak aktywnych seedów'); process.exit(1) }
  console.log(`Seedy (${seeds.length}): ${seeds.join(', ')}`)

  const { authors, videos, cost } = await sweep(seeds)
  console.log(`Wideo: ${videos} | unikatowych autorów: ${authors.size} | koszt sweepu $${cost.toFixed(4)}`)
  // Cz.3-5: resolve bio → weryfikacja Shopify → zapis + raport
}
main().catch((e) => { console.error(e); process.exit(1) })
