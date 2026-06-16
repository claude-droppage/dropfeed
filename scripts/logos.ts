/**
 * Hosting logo marek na Cloudflare R2 (FAZA A).
 *
 * Źródło: snapshot.page_profile_picture_url z raw_ads (profilówka strony FB).
 * URL-e Meta wygasają jak kreacje → pobieramy i hostujemy na R2
 * (logos/<page_id>.jpg), zapisujemy brands.logo_url. Brak/wygasłe → brands bez
 * logo (UI fallback = inicjały).
 *
 * Uruchamianie: npm run logos [-- --force]   (--force nadpisuje istniejące)
 * Idempotentny. Sekrety R2_* + SUPABASE_SERVICE_ROLE_KEY z .env.local.
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
const { NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE,
  R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET, R2_PUBLIC_BASE } = env
for (const [k, v] of Object.entries({ SUPABASE_URL, SERVICE_ROLE, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET, R2_PUBLIC_BASE })) {
  if (!v) { console.error(`✗ Brak ${k} w .env.local`); process.exit(1) }
}
const FORCE = process.argv.includes('--force')

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE!, { auth: { persistSession: false, autoRefreshToken: false } })
const aws = new AwsClient({ accessKeyId: R2_ACCESS_KEY_ID!, secretAccessKey: R2_SECRET_ACCESS_KEY!, service: 's3', region: 'auto' })

async function mapPool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const idx = i++; await fn(items[idx]) }
  }))
}

interface BrandRow { id: string; fb_page_id: string | null; logo_url: string | null }

async function main() {
  // 1) marki do przetworzenia
  let q = supabase.from('brands').select('id,fb_page_id,logo_url').not('fb_page_id', 'is', null)
  if (!FORCE) q = q.is('logo_url', null)
  const { data: brands, error: be } = await q
  if (be) { console.error('✗ brands:', be.message); process.exit(1) }
  const todo = (brands as BrandRow[])
  if (!todo.length) { console.log('Brak marek do przetworzenia (wszystkie mają logo?).'); return }

  // 2) mapa page_id → profilówka (z raw_ads, pierwsza niepusta)
  const { data: raws, error: re } = await supabase
    .from('raw_ads')
    .select('pid:payload->snapshot->>page_id, pic:payload->snapshot->>page_profile_picture_url')
  if (re) { console.error('✗ raw_ads:', re.message); process.exit(1) }
  const picByPage = new Map<string, string>()
  for (const r of raws as { pid: string | null; pic: string | null }[]) {
    if (r.pid && r.pic && !picByPage.has(r.pid)) picByPage.set(r.pid, r.pic)
  }
  console.log(`Marek: ${todo.length} | profilówek w raw_ads: ${picByPage.size}`)

  let ok = 0, noPic = 0, failDl = 0, failUp = 0
  await mapPool(todo, 8, async (brand) => {
    const pid = brand.fb_page_id!
    const url = picByPage.get(pid)
    if (!url) { noPic++; return }
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 15000)
      const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 swipespy-logos' } })
      clearTimeout(t)
      if (!res.ok) { failDl++; return }
      const ct = res.headers.get('content-type') ?? 'image/jpeg'
      const buf = new Uint8Array(await res.arrayBuffer())
      if (!buf.length) { failDl++; return }
      const key = `logos/${pid}.jpg`
      const put = await aws.fetch(`${R2_ENDPOINT}/${R2_BUCKET}/${key}`, { method: 'PUT', body: buf, headers: { 'content-type': ct } })
      if (!put.ok) { failUp++; return }
      const { error: ue } = await supabase.from('brands').update({ logo_url: `${R2_PUBLIC_BASE}/${key}` }).eq('id', brand.id)
      if (ue) { failUp++; return }
      ok++
    } catch { failDl++ }
  })

  console.log(`\n✓ Logo na R2: ${ok} | bez profilówki: ${noPic} | błąd pobrania (wygasłe Meta): ${failDl} | błąd upload/DB: ${failUp}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
