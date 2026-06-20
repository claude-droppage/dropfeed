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
import { detectPlatform } from '../lib/shopify.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const env: Record<string, string> = {}
try { for (const l of readFileSync(resolve(root, '.env.local'), 'utf8').split('\n')) { const t = l.trim(); if (!t || t.startsWith('#')) continue; const e = t.indexOf('='); if (e > 0) env[t.slice(0, e).trim()] = t.slice(e + 1).trim() } } catch { /* CI */ }
const E = { ...env, ...process.env }
const supabase = createClient(E.NEXT_PUBLIC_SUPABASE_URL!, E.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
const TOKEN = E.APIFY_TOKEN!

// ── parametry (strojalne env) ────────────────────────────────────────────
const SEEDS_PER_RUN = parseInt(E.SEEDS_PER_RUN ?? '8', 10)
const MAX_VIDEOS_PER_SEED = parseInt(E.MAX_VIDEOS_PER_SEED ?? '120', 10)
const MAX_PROFILES_PER_RUN = parseInt(E.MAX_PROFILES_PER_RUN ?? '150', 10)

const SWEEP_ACTOR = 'clockworks~tiktok-scraper'
const PROFILE_ACTOR = 'clockworks~tiktok-profile-scraper'

// agregatory link-in-bio → schodzimy 1 hop głębiej po realny sklep
const AGG = /(^|\.)(linktr\.ee|beacons\.ai|bio\.site|lnk\.bio|komi\.io|stan\.store|hoo\.be|msha\.ke|milkshake|campsite\.bio|snipfeed|withkoji|taplink|linkpop|allmylinks|solo\.to|carrd\.co|flowcode|tap\.bio)/i
// blocklista false-positives (konfigurowalna): app store / motywy / edukatorzy / theme-shops
const BLOCK = /apps\.shopify\.com|(^|\.)shopify\.com|\/themes|themeforest|debutify|shoptimized|ecomhunt|sellthetrend/i
// śmieci do odsiania przy 1-hopie agregatora
const JUNK = /tiktok|instagram|facebook|fb\.com|youtube|youtu\.be|twitter|x\.com|snapchat|spotify|amazon|pinterest|whatsapp|t\.me|paypal|cdn|cloudfront|gstatic|googleapis|google\.com|fonts|sentry|\.(png|jpg|jpeg|gif|svg|css|js|ico|woff)/i

const normDomain = (url: string): string => { try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase() } catch { return '' } }
const asStr = (x: unknown): string => (typeof x === 'string' ? x : x && typeof x === 'object' ? String((x as Record<string, unknown>).link ?? (x as Record<string, unknown>).url ?? '') : '')

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length); let i = 0
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]) } }))
  return out
}

/** Czy URL to potwierdzony Shopify (z URL-layer lub fetch sygnatur). */
async function isShopify(url: string): Promise<boolean> {
  if (!url || BLOCK.test(url)) return false
  try { return (await detectPlatform(url, 8000)).platform === 'shopify' } catch { return false }
}

/** bio → realny sklep. Bezpośredni link albo 1 hop przez agregator. Zwraca store_url|null. */
async function resolveStore(bio: string): Promise<string | null> {
  if (!bio) return null
  const host = normDomain(bio)
  if (!host) return null
  if (!AGG.test(host)) return (await isShopify(bio)) ? bio : null
  // agregator → pobierz stronę, wyciągnij linki wychodzące (1 hop), testuj kandydatów
  try {
    const r = await fetch(bio.startsWith('http') ? bio : 'https://' + bio, { signal: AbortSignal.timeout(9000), headers: { 'user-agent': 'Mozilla/5.0 swipespy' }, redirect: 'follow' })
    const html = (await r.text()).slice(0, 300_000)
    const set = new Set<string>(); const re = /https?:\/\/[a-z0-9.\-]+\.[a-z]{2,}[^\s"'<>\\)]*/gi; let m
    while ((m = re.exec(html))) { const u = m[0]; if (AGG.test(u) || JUNK.test(u) || BLOCK.test(u)) continue; try { set.add(new URL(u).origin) } catch { /* skip */ } }
    for (const cand of [...set].slice(0, 10)) if (await isShopify(cand)) return cand
  } catch { /* timeout/blokada */ }
  return null
}

/** clockworks profile-scraper → mapa handle→bioLink (sweep zwykle nie ma bio). */
async function profileBios(handles: string[]): Promise<{ map: Map<string, string>; cost: number }> {
  const map = new Map<string, string>()
  if (!handles.length) return { map, cost: 0 }
  const { items, cost } = await apifyRun(PROFILE_ACTOR, { profiles: handles, resultsPerPage: 1, shouldDownloadVideos: false, shouldDownloadCovers: false })
  for (const p of items) { const am = (p.authorMeta ?? p) as Record<string, unknown>; const nm = String(am.name ?? ''); if (nm && !map.has(nm)) map.set(nm, asStr(am.bioLink)) }
  return { map, cost }
}

export interface VerifiedSeller extends Author { storeUrl: string; storeDomain: string }

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

  const { authors, videos, cost: sweepCost } = await sweep(seeds)
  console.log(`Wideo: ${videos} | unikatowych autorów: ${authors.size} | koszt sweepu $${sweepCost.toFixed(4)}`)

  // cap profili: najmocniejsi autorzy (max playCount) — kontrola kosztu profile-scrape
  const top = [...authors.values()].sort((a, b) => b.bestPlayCount - a.bestPlayCount).slice(0, MAX_PROFILES_PER_RUN)
  const { map: bios, cost: profCost } = await profileBios(top.map((a) => a.handle))
  console.log(`Profili pobranych: ${top.length} | z bioLink: ${[...bios.values()].filter(Boolean).length}`)

  // resolve bio → weryfikacja Shopify (1 hop dla agregatorów)
  const verified: VerifiedSeller[] = []
  await pool(top, 8, async (a) => {
    const bio = bios.get(a.handle) || a.bioLink
    const store = await resolveStore(bio)
    if (store) verified.push({ ...a, storeUrl: store, storeDomain: normDomain(store) })
  })
  console.log(`Zweryfikowani (bio → Shopify): ${verified.length}`)
  // Cz.4-5: zapis + cross-source + cover R2 + log + raport
  const apifyCost = sweepCost + profCost
  void apifyCost
}
main().catch((e) => { console.error(e); process.exit(1) })
