/**
 * Perceptual hash + klaster kreacji (Perełki v1, COMPUTE — nic nie publikuje).
 * dHash 64-bit z miniatury/postera R2 (sharp: grayscale 9×8 → porównanie sąsiednich pikseli).
 * Klastruje near-duplikaty po dystansie Hamminga (próg konserwatywny). Zapisuje ads.phash + cluster_id.
 *
 * Uruchamianie: npm run phash [-- --threshold 7]
 * Sekrety: SUPABASE_SERVICE_ROLE_KEY z .env.local.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  try { for (const line of readFileSync(resolve(root, '.env.local'), 'utf8').split('\n')) { const t = line.trim(); if (!t || t.startsWith('#')) continue; const e = t.indexOf('='); if (e > 0) env[t.slice(0, e).trim()] = t.slice(e + 1).trim() } } catch { /* CI */ }
  return env
}
const env = { ...loadEnv(), ...process.env }
const { NEXT_PUBLIC_SUPABASE_URL: URL, SUPABASE_SERVICE_ROLE_KEY: KEY } = env
if (!URL || !KEY) { console.error('✗ Brak SUPABASE creds'); process.exit(1) }
const supabase = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const ti = process.argv.indexOf('--threshold')
const THRESHOLD = ti !== -1 ? parseInt(process.argv[ti + 1], 10) : 7 // ≤7/64 = konserwatywnie (nie sklejać różnych)

// dHash: grayscale 9×8, w każdym wierszu porównaj sąsiednie piksele → 64 bity → hex(16)
async function dhash(buf: Uint8Array): Promise<string | null> {
  try {
    const raw = await sharp(buf).grayscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer()
    let bits = 0n
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const i = row * 9 + col
      bits = (bits << 1n) | (raw[i] > raw[i + 1] ? 1n : 0n)
    }
    return bits.toString(16).padStart(16, '0')
  } catch { return null }
}
const hamming = (a: string, b: string) => {
  let x = BigInt('0x' + a) ^ BigInt('0x' + b), c = 0
  while (x) { c += Number(x & 1n); x >>= 1n }
  return c
}
async function mapPool<T, R>(items: T[], n: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length); let i = 0
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx) } }))
  return out
}

interface Row { id: string; url: string; created_at: string; name: string }

async function main() {
  // ads aktywne z miniaturą/posterem R2 + nazwa produktu (do podglądu klastrów)
  const rows: Row[] = []
  for (let off = 0; ; off += 1000) {
    const { data, error } = await supabase.from('ads')
      .select('id, thumb_url, creative_url, created_at, products(name)')
      .eq('is_active', true).range(off, off + 999)
    if (error) { console.error('✗ ads:', error.message); process.exit(1) }
    const batch = (data as { id: string; thumb_url: string | null; creative_url: string; created_at: string; products: { name: string } | null }[])
    for (const a of batch) {
      const url = (a.thumb_url && /r2\.dev/.test(a.thumb_url)) ? a.thumb_url : (/r2\.dev/.test(a.creative_url) ? a.creative_url : null)
      if (url) rows.push({ id: a.id, url, created_at: a.created_at, name: a.products?.name ?? '?' })
    }
    if (batch.length < 1000) break
  }
  console.log(`Ads do hashowania: ${rows.length}`)

  let failed = 0
  const hashes = await mapPool(rows, 12, async (r) => {
    try {
      const res = await fetch(r.url, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) { failed++; return null }
      return await dhash(new Uint8Array(await res.arrayBuffer()))
    } catch { failed++; return null }
  })
  const hashed = rows.map((r, i) => ({ ...r, h: hashes[i] })).filter((r) => r.h) as (Row & { h: string })[]
  console.log(`Zhashowano: ${hashed.length} (błędy pobrania/dekodowania: ${failed})`)

  // klaster greedy: anchor = najstarszy (kanoniczny); near-dup ≤ THRESHOLD dołącza
  hashed.sort((a, b) => a.created_at.localeCompare(b.created_at))
  const reps: { cid: number; h: string }[] = []
  const cidByAd = new Map<string, number>()
  let nextCid = 1
  for (const r of hashed) {
    let found = -1
    for (const rep of reps) { if (hamming(r.h, rep.h) <= THRESHOLD) { found = rep.cid; break } }
    if (found === -1) { found = nextCid++; reps.push({ cid: found, h: r.h }) }
    cidByAd.set(r.id, found)
  }
  const nClusters = nextCid - 1
  const collapsed = hashed.length - nClusters
  console.log(`Klastry: ${nClusters} · near-duplikatów skleiło: ${collapsed} · próg Hamminga ≤${THRESHOLD}/64`)

  // zapis phash + cluster_id
  for (let i = 0; i < hashed.length; i += 200) {
    await Promise.all(hashed.slice(i, i + 200).map((r) => supabase.from('ads').update({ phash: r.h, cluster_id: cidByAd.get(r.id) }).eq('id', r.id)))
  }

  // log: największe klastry + próbka członków
  const byCluster = new Map<number, string[]>()
  for (const r of hashed) { const c = cidByAd.get(r.id)!; if (!byCluster.has(c)) byCluster.set(c, []); byCluster.get(c)!.push(r.name) }
  const top = [...byCluster.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 12)
  console.log('\nNajwiększe klastry (rozmiar · próbka nazw):')
  for (const [cid, names] of top) console.log(`  #${cid} ×${names.length}: ${[...new Set(names)].slice(0, 3).map((n) => n.slice(0, 28)).join(' | ')}`)
  const dist = [...byCluster.values()].reduce((a, m) => { const k = m.length >= 5 ? '5+' : String(m.length); a[k] = (a[k] || 0) + 1; return a }, {} as Record<string, number>)
  console.log('Rozkład rozmiarów klastrów:', JSON.stringify(dist))
}
main().catch((e) => { console.error(e); process.exit(1) })
