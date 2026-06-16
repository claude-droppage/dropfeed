/**
 * Rehosting kreacji na Cloudflare R2 (Etap 1, krok 5) — BEZ transkodowania.
 *
 * Pobiera creative_url/thumb_url (URL-e Meta) z tabeli ads, wgrywa pliki as-is
 * na R2 (S3 API) i podmienia creative_url/thumb_url na publiczne URL-e R2.
 * Dzięki temu media w feedzie nie wygasają i lecą z szybkiego CDN (zero egress).
 *
 * Uruchamianie:
 *   npm run rehost -- --limit 20     # próbka
 *   npm run rehost                   # wszystkie jeszcze nie na R2
 *   npm run rehost -- --force        # nadpisz też te już na R2
 *
 * Idempotentny: domyślnie pomija ads, których creative_url już wskazuje na R2;
 * klucz R2 deterministyczny (po ad_archive_id), PutObject nadpisuje.
 * Sekrety z .env.local (server-side): R2_*, SUPABASE_SERVICE_ROLE_KEY.
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { AwsClient } from 'aws4fetch'

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
const {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE,
  R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET, R2_PUBLIC_BASE,
} = env
for (const [k, v] of Object.entries({ SUPABASE_URL, SERVICE_ROLE, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET, R2_PUBLIC_BASE })) {
  if (!v) { console.error(`✗ Brak ${k} w .env.local`); process.exit(1) }
}

const FORCE = process.argv.includes('--force')
const li = process.argv.indexOf('--limit')
const LIMIT = li !== -1 ? parseInt(process.argv[li + 1], 10) : Infinity

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE!, { auth: { persistSession: false, autoRefreshToken: false } })
const aws = new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID!, secretAccessKey: R2_SECRET_ACCESS_KEY!, service: 's3', region: 'auto' })

const EXT_BY_CT: Record<string, string> = {
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
}
function extFor(ct: string, format: string): string {
  const base = ct.split(';')[0].trim().toLowerCase()
  return EXT_BY_CT[base] ?? (format === 'video' ? 'mp4' : 'jpg')
}

async function download(url: string): Promise<{ buf: Uint8Array; ct: string } | null> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 20000)
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 swipespy-rehost' } })
    clearTimeout(t)
    if (!res.ok) return null
    const ct = res.headers.get('content-type') ?? ''
    const buf = new Uint8Array(await res.arrayBuffer())
    if (!buf.length) return null
    return { buf, ct }
  } catch { return null }
}

async function putR2(key: string, buf: Uint8Array, ct: string): Promise<boolean> {
  try {
    const res = await aws.fetch(`${R2_ENDPOINT}/${R2_BUCKET}/${key}`, {
      method: 'PUT', body: buf, headers: { 'content-type': ct || 'application/octet-stream' },
    })
    return res.ok
  } catch {
    return false
  }
}

async function mapPool<T>(items: T[], n: number, fn: (x: T, i: number) => Promise<void>): Promise<void> {
  let i = 0
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const idx = i++; await fn(items[idx], idx) }
  }))
}

interface AdRow { id: string; ad_archive_id: string; creative_url: string; thumb_url: string | null; format: string }

async function main() {
  let q = supabase.from('ads')
    .select('id,ad_archive_id,creative_url,thumb_url,format')
    .order('heat_score', { ascending: false })
  if (!FORCE) q = q.not('creative_url', 'ilike', `${R2_PUBLIC_BASE}%`)
  if (LIMIT !== Infinity) q = q.limit(LIMIT)
  const { data, error } = await q
  if (error) { console.error('✗ ads:', error.message); process.exit(1) }
  const ads = (data as AdRow[]).filter((a) => a.ad_archive_id)
  if (!ads.length) { console.log('Brak reklam do rehostu (wszystko już na R2?).'); return }
  console.log(`Rehost → R2 (${R2_BUCKET}); reklam: ${ads.length}${FORCE ? ' [force]' : ''}`)

  let ok = 0, failDl = 0, failUp = 0
  const fails: string[] = []

  await mapPool(ads, 6, async (ad) => {
   try {
    // 1) creative
    if (!ad.creative_url || !/^https?:\/\//.test(ad.creative_url)) { failDl++; return }
    const dl = await download(ad.creative_url)
    if (!dl) { failDl++; fails.push(ad.ad_archive_id); return }
    const ext = extFor(dl.ct, ad.format)
    const cKey = `creatives/${ad.ad_archive_id}.${ext}`
    if (!(await putR2(cKey, dl.buf, dl.ct || (ad.format === 'video' ? 'video/mp4' : 'image/jpeg')))) { failUp++; return }
    const newCreative = `${R2_PUBLIC_BASE}/${cKey}`

    // 2) thumb — dla obrazów ten sam plik; dla wideo osobny poster jeśli jest
    let newThumb = ad.format === 'image' ? newCreative : null
    if (ad.format === 'video' && ad.thumb_url && /^https?:\/\//.test(ad.thumb_url) && ad.thumb_url !== ad.creative_url) {
      const td = await download(ad.thumb_url)
      if (td) {
        const text = extFor(td.ct, 'image')
        const tKey = `thumbs/${ad.ad_archive_id}.${text}`
        if (await putR2(tKey, td.buf, td.ct || 'image/jpeg')) newThumb = `${R2_PUBLIC_BASE}/${tKey}`
      }
    }

    // 3) update DB
    const { error: ue } = await supabase.from('ads')
      .update({ creative_url: newCreative, thumb_url: newThumb })
      .eq('id', ad.id)
    if (ue) { failUp++; return }
    ok++
    if (ok % 50 === 0) process.stdout.write(`\r  ok:${ok} failDl:${failDl} failUp:${failUp}   `)
   } catch {
    failUp++
   }
  })

  console.log(`\n✓ Gotowe. Przeniesione: ${ok}, błąd pobierania (Meta): ${failDl}, błąd uploadu/DB: ${failUp}`)
  if (fails.length) console.log(`  Przykładowe ad_archive_id z błędem pobierania: ${fails.slice(0, 8).join(', ')}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
