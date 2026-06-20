/**
 * RECON TikTok ads → produkty (podgląd /tiktok-recon). Read-only dla apki; zapisuje artefakt
 * do tiktok_ad_recon. Mostki: A pHash↔FB (główny), B profil→bioLink→Shopify (próba), C marka.
 * Uruchamianie: npm run tiktok:recon
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const env: Record<string, string> = {}
try { for (const l of readFileSync(resolve(root, '.env.local'), 'utf8').split('\n')) { const t = l.trim(); if (!t || t.startsWith('#')) continue; const e = t.indexOf('='); if (e > 0) env[t.slice(0, e).trim()] = t.slice(e + 1).trim() } } catch { /* CI */ }
const E = { ...env, ...process.env }
const supabase = createClient(E.NEXT_PUBLIC_SUPABASE_URL!, E.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
const TOKEN = E.APIFY_TOKEN!

const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')
async function dhash(buf: Uint8Array): Promise<string | null> {
  try {
    const raw = await sharp(buf).grayscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer()
    let bits = 0n
    for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const i = r * 9 + c; bits = (bits << 1n) | (raw[i] > raw[i + 1] ? 1n : 0n) }
    return bits.toString(16).padStart(16, '0')
  } catch { return null }
}
const ham = (a: string, b: string) => { let x = BigInt('0x' + a) ^ BigInt('0x' + b), c = 0; while (x) { c += Number(x & 1n); x >>= 1n } return c }
async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length); let i = 0
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]) } }))
  return out
}
async function apifyRun(act: string, input: unknown, ms = 120000): Promise<{ items: Record<string, unknown>[]; cost: number }> {
  const r = await fetch(`https://api.apify.com/v2/acts/${act}/runs?token=${TOKEN}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) })
  if (!r.ok) return { items: [], cost: 0 }
  const run = (await r.json()).data as { id: string; defaultDatasetId: string }
  let st = 'RUNNING'
  for (let i = 0; i < ms / 5000; i++) { await new Promise((x) => setTimeout(x, 5000)); st = (await (await fetch(`https://api.apify.com/v2/actor-runs/${run.id}?token=${TOKEN}`)).json()).data.status; if (st !== 'RUNNING' && st !== 'READY') break }
  const fin = (await (await fetch(`https://api.apify.com/v2/actor-runs/${run.id}?token=${TOKEN}`)).json()).data
  const items = await (await fetch(`https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?token=${TOKEN}&limit=1000`)).json() as Record<string, unknown>[]
  return { items: Array.isArray(items) ? items : [], cost: Number(fin?.usageTotalUsd ?? 0) }
}
const mediaImg = (m: unknown): string | null => {
  if (!Array.isArray(m)) return null
  for (const s of m) { const str = String(s); if (str.startsWith('Image')) { const u = str.split(': ').slice(1).join(': '); if (u.startsWith('http')) return u } }
  return null
}
const detail = (arr: unknown, key: string): string => {
  if (!Array.isArray(arr)) return ''
  for (const o of arr) if (o && typeof o === 'object' && key in (o as object)) return String((o as Record<string, unknown>)[key] ?? '')
  return ''
}

async function main() {
  let cost = 0
  // 1) scrape EU Ad Library (data_xplorer) — kilka fraz, region all
  const ads: Record<string, unknown>[] = []
  for (const q of ['shop', 'sklep', 'home', 'gadget']) {
    const { items, cost: c } = await apifyRun('data_xplorer~tiktok-ads-scraper', { mode: 'library', region: 'all', queryType: '1', query: q, maxAds: 40, fetchDetails: true })
    cost += c; ads.push(...items)
    console.log(`  "${q}": ${items.length} ($${c.toFixed(4)})`)
  }
  // dedup po ad_id
  const seen = new Set<string>()
  const uniq = ads.filter((a) => { const id = String(a['AD ID'] ?? ''); if (!id || seen.has(id)) return false; seen.add(id); return true })
  console.log(`Unikatowych reklam: ${uniq.length} · scrape koszt $${cost.toFixed(4)}`)

  // 2) dHash kreacji (Image)
  const withImg = uniq.map((a) => ({ a, img: mediaImg(a['Ad Media']) })).filter((x) => x.img)
  const hashes = await pool(withImg, 12, async (x) => {
    try { const r = await fetch(x.img!, { signal: AbortSignal.timeout(15000) }); if (!r.ok) return null; return await dhash(new Uint8Array(await r.arrayBuffer())) } catch { return null }
  })
  const hashed = withImg.map((x, i) => ({ ...x, h: hashes[i] })).filter((x) => x.h) as { a: Record<string, unknown>; img: string; h: string }[]
  console.log(`Zhashowanych: ${hashed.length}/${uniq.length}`)

  // 3) FB phashe + produkty (Mostek A) + marki (Mostek C)
  const fb: { phash: string; pid: string; name: string; offer: string; platform: string }[] = []
  for (let off = 0; ; off += 1000) {
    const { data } = await supabase.from('ads').select('phash, product_id, platform, products(name, offer_url)').not('phash', 'is', null).range(off, off + 999)
    const b = (data as { phash: string; product_id: string; platform: string | null; products: { name: string; offer_url: string } | null }[]) ?? []
    for (const r of b) if (r.product_id) fb.push({ phash: r.phash, pid: r.product_id, name: r.products?.name ?? '?', offer: r.products?.offer_url ?? '', platform: r.platform ?? '' })
    if (b.length < 1000) break
  }
  const { data: brandsData } = await supabase.from('brands').select('name')
  const fbBrandNorms = new Set((brandsData as { name: string }[]).map((b) => norm(b.name)).filter((n) => n.length >= 4))
  const THRESH = 10

  // 4) dopasowania + zapis
  const rows = hashed.map((x) => {
    const adv = String(x.a['Advertiser Name'] ?? x.a['Ad Sponsor'] ?? '')
    let best = { h: 99, pid: '', name: '', offer: '', platform: '' }
    for (const f of fb) { const d = ham(x.h, f.phash); if (d < best.h) best = { h: d, pid: f.pid, name: f.name, offer: f.offer, platform: f.platform } }
    const A = best.h <= THRESH
    const C = fbBrandNorms.has(norm(adv)) && norm(adv).length >= 4
    return {
      ad_id: String(x.a['AD ID']), advertiser: adv, regions: ((x.a['Ad Targeting'] as Record<string, unknown>)?.regions as string[]) ?? null,
      reach: String(x.a['Ad Audience'] ?? ''), cta: detail(x.a['Ad Details'], 'Call To Action'),
      first_shown: (x.a['Ad Dates'] as Record<string, unknown>[])?.[0]?.FirstShown ?? null,
      last_shown: (x.a['Ad Dates'] as Record<string, unknown>[])?.[1]?.LastShown ?? null,
      media_url: x.img, phash: x.h,
      matched_product_id: A ? best.pid : null, matched_name: A ? best.name : null, matched_offer_url: A ? best.offer : null,
      matched_platform: A ? best.platform : null, hamming: best.h <= 64 ? best.h : null,
      brand_match: C ? adv : null,
    }
  })
  await supabase.from('tiktok_ad_recon').delete().neq('ad_id', '')
  for (let i = 0; i < rows.length; i += 200) await supabase.from('tiktok_ad_recon').upsert(rows.slice(i, i + 200), { onConflict: 'ad_id' })

  const A = rows.filter((r) => r.matched_product_id).length
  const C = rows.filter((r) => r.brand_match).length
  console.log(`\n— WYNIK —`)
  console.log(`Mostek A (pHash↔FB, ham≤${THRESH}): ${A}/${rows.length}`)
  console.log(`Mostek C (nazwa marki↔FB): ${C}/${rows.length}`)
  console.log(`Najlepsze dopasowania A:`)
  rows.filter((r) => r.matched_product_id).sort((a, b) => (a.hamming ?? 99) - (b.hamming ?? 99)).slice(0, 8)
    .forEach((r) => console.log(`  ham=${r.hamming} | ${r.advertiser?.slice(0, 18)} ↔ ${r.matched_name?.slice(0, 30)}`))
  console.log(`\nKOSZT recon: $${cost.toFixed(4)} (data_xplorer; ~$${(cost / Math.max(1, uniq.length)).toFixed(5)}/reklama)`)
}
main().catch((e) => { console.error(e); process.exit(1) })
