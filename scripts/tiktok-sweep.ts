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
import { AwsClient } from 'aws4fetch'
import { detectPlatform } from '../lib/shopify.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const env: Record<string, string> = {}
try { for (const l of readFileSync(resolve(root, '.env.local'), 'utf8').split('\n')) { const t = l.trim(); if (!t || t.startsWith('#')) continue; const e = t.indexOf('='); if (e > 0) env[t.slice(0, e).trim()] = t.slice(e + 1).trim() } } catch { /* CI */ }
const E = { ...env, ...process.env }
const supabase = createClient(E.NEXT_PUBLIC_SUPABASE_URL!, E.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
const TOKEN = E.APIFY_TOKEN!

// ── parametry (strojalne env) ────────────────────────────────────────────
// Pomiar 2026-06-20: clockworks ~$0.003/wideo. 120/seed×8 = 960 wideo = $2.88 sweep
// (profilujemy i tak tylko top MAX_PROFILES). Domyślne capy zestrojone pod ~$1/run:
// 40/seed×8 ≈ 320 wideo (~$1 sweep) + 120 profili (~$0.5) ≈ $1.5. Strojalne env.
const SEEDS_PER_RUN = parseInt(E.SEEDS_PER_RUN ?? '8', 10)
const MAX_VIDEOS_PER_SEED = parseInt(E.MAX_VIDEOS_PER_SEED ?? '40', 10)
const MAX_PROFILES_PER_RUN = parseInt(E.MAX_PROFILES_PER_RUN ?? '120', 10)

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

// ── R2 (reuse wzorca z rehost.ts: download z retry/backoff + putR2) ───────
const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET, R2_PUBLIC_BASE } = E
const aws = new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID!, secretAccessKey: R2_SECRET_ACCESS_KEY!, service: 's3', region: 'auto' })
async function dl(url: string): Promise<Uint8Array | null> {
  for (let a = 0; a < 3; a++) {
    try { const r = await fetch(url, { signal: AbortSignal.timeout(20000) }); if (r.ok) return new Uint8Array(await r.arrayBuffer()) } catch { /* transient */ }
    await new Promise((x) => setTimeout(x, 400 * (a + 1)))
  }
  return null
}
async function coverToR2(handle: string, coverUrl: string): Promise<string | null> {
  if (!coverUrl) return null
  const buf = await dl(coverUrl); if (!buf) return null
  const key = `tiktok-covers/${handle.replace(/[^a-z0-9_.-]/gi, '_')}.jpg`
  try {
    const res = await aws.fetch(`${R2_ENDPOINT}/${R2_BUCKET}/${key}`, { method: 'PUT', body: buf, headers: { 'content-type': 'image/jpeg' } })
    return res.ok ? `${R2_PUBLIC_BASE}/${key}` : null
  } catch { return null }
}

/** Keyword do „Szukaj na AliExpress" = tytuł top-produktu sklepu (Shopify /products.json, $0). */
function cleanQuery(title: string): string {
  return title.split('|')[0].replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean).slice(0, 6).join(' ').trim()
}
async function topProductQuery(domain: string): Promise<string | null> {
  if (!domain) return null
  try {
    const r = await fetch(`https://${domain}/products.json?limit=1`, { signal: AbortSignal.timeout(8000), headers: { 'user-agent': 'Mozilla/5.0' } })
    if (!r.ok) return null
    const j = await r.json() as { products?: { title?: string }[] }
    const t = j.products?.[0]?.title
    return t ? (cleanQuery(t) || null) : null
  } catch { return null }
}

/** Domeny sklepów z FB (offer_url winnerów) — do cross_source. */
async function fbStoreDomains(): Promise<Set<string>> {
  const set = new Set<string>()
  for (let off = 0; ; off += 1000) {
    const { data } = await supabase.from('products').select('offer_url').not('offer_url', 'is', null).range(off, off + 999)
    const b = (data as { offer_url: string }[]) ?? []
    for (const r of b) { const d = normDomain(r.offer_url); if (d) set.add(d) }
    if (b.length < 1000) break
  }
  return set
}

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
        sourceSeed: String(v.input ?? (v.searchHashtag as Record<string, unknown> | undefined)?.name ?? ''),
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

  // dedup w obrębie runu po store_domain (jeden sklep = jeden rekord; najlepszy playCount wygrywa)
  const byStore = new Map<string, VerifiedSeller>()
  for (const v of verified.sort((a, b) => b.bestPlayCount - a.bestPlayCount)) if (!byStore.has(v.storeDomain)) byStore.set(v.storeDomain, v)
  const sellers = [...byStore.values()]

  // cross_source: domena sklepu == domena z offer_url winnerów FB
  const fbDomains = await fbStoreDomains()
  // ile to NOWI (przed upsertem) — po store_domain
  const { data: existRows } = await supabase.from('tiktok_organic_sellers').select('store_domain')
  const existing = new Set((existRows as { store_domain: string }[] ?? []).map((r) => r.store_domain))
  const newCount = sellers.filter((s) => !existing.has(s.storeDomain)).length

  // cover najlepszego filmiku → R2 + upsert (per rekord; onConflict store_domain; first_seen tylko na insert)
  let saved = 0
  await pool(sellers, 6, async (s) => {
    const [cover, aliQuery] = await Promise.all([coverToR2(s.handle, s.bestCover), topProductQuery(s.storeDomain)])
    const { error } = await supabase.from('tiktok_organic_sellers').upsert({
      handle: s.handle, store_url: s.storeUrl, store_domain: s.storeDomain,
      best_video_url: s.bestVideoUrl, best_video_cover_r2: cover, best_video_playcount: s.bestPlayCount,
      best_video_posted_at: s.bestPostedAt, last_seen: new Date().toISOString(),
      cross_source: fbDomains.has(s.storeDomain), source_seed: s.sourceSeed, ali_query: aliQuery,
    }, { onConflict: 'store_domain' })
    if (!error) saved++
    else console.error(`  ✗ upsert @${s.handle} (${s.storeDomain}): ${error.message}`)
  })

  // log runu + rotacja seedów (last_used_at)
  const apifyCost = sweepCost + profCost
  await supabase.from('tiktok_organic_runs').insert({ seeds, videos, profiles: top.length, verified: sellers.length, new_sellers: newCount })
  await supabase.from('tiktok_organic_seeds').update({ last_used_at: new Date().toISOString() }).in('seed', seeds)

  const crossN = sellers.filter((s) => fbDomains.has(s.storeDomain)).length

  // produktywność per seed (verified/seed) + total w bazie
  const perSeed = new Map<string, number>()
  for (const s of seeds) perSeed.set(s, 0)
  for (const s of sellers) { const k = seeds.find((q) => s.sourceSeed === q || s.sourceSeed.replace(/^#/, '') === q) ?? s.sourceSeed; perSeed.set(k, (perSeed.get(k) ?? 0) + 1) }
  const { count: totalDb } = await supabase.from('tiktok_organic_sellers').select('*', { count: 'exact', head: true })

  console.log(`\n══════ RAPORT RUNU ══════`)
  console.log(`Wideo: ${videos} | autorzy: ${authors.size} | profile: ${top.length} | zweryfikowani: ${sellers.length} | zapisani: ${saved}`)
  console.log(`Nowi zweryfikowani: ${newCount} | sprzedawców w bazie łącznie: ${totalDb ?? '?'} | cross-source FB×TikTok: ${crossN}`)
  console.log(`Produktywność per seed (verified/seed):`)
  for (const [s, n] of [...perSeed.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${n}  ${s}`)
  console.log(`Koszt Apify za run: $${apifyCost.toFixed(4)}  (sweep $${sweepCost.toFixed(4)} + profile $${profCost.toFixed(4)})`)
  console.log(`═════════════════════════`)
}
main().catch((e) => { console.error(e); process.exit(1) })
