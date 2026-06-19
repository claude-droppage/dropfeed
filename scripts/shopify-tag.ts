/**
 * Backfill tagu platformy (shopify/non_shopify/unknown) + landing_type dla istniejących ads.
 * URL-layer ($0) + fetch custom domen (HTTP, NIE Apify). Dedup po offer_url (mniej fetchy).
 * NIE usuwa istniejących — tylko taguje + raportuje rozkład i ile by odpadło (gate=future w enrich).
 *
 * Uruchamianie: npm run shopify:tag
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { detectPlatform } from '../lib/shopify.ts'

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

async function mapPool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length); let i = 0
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]) }
  }))
  return out
}

const main = async () => {
  // dystynktne offer_url z products (źródło landingu) → tag ads tego produktu
  const { data: prods } = await supabase.from('products').select('id, offer_url').not('offer_url', 'is', null)
  const urlByProduct = new Map<string, string>((prods as { id: string; offer_url: string }[]).map((p) => [p.id, p.offer_url]))
  const distinctUrls = [...new Set([...urlByProduct.values()])]
  console.log(`Dystynktnych offer_url: ${distinctUrls.length}`)

  const results = await mapPool(distinctUrls, 12, async (u) => ({ url: u, ...(await detectPlatform(u)) }))
  const byUrl = new Map(results.map((r) => [r.url, r]))

  // tag ads (po product_id → offer_url)
  let tagged = 0
  for (const [pid, u] of urlByProduct) {
    const d = byUrl.get(u); if (!d) continue
    const { error: ue, count } = await supabase.from('ads').update({ platform: d.platform, landing_type: d.landing_type }, { count: 'exact' }).eq('product_id', pid)
    if (!ue) tagged += count ?? 0
  }

  const dist = results.reduce((a, r) => { a[r.platform] = (a[r.platform] || 0) + 1; return a }, {} as Record<string, number>)
  const lt = results.reduce((a, r) => { a[r.landing_type] = (a[r.landing_type] || 0) + 1; return a }, {} as Record<string, number>)
  console.log(`Otagowano ads: ${tagged}`)
  console.log(`Rozkład platform (per URL): ${JSON.stringify(dist)}`)
  console.log(`Landing types (per URL): ${JSON.stringify(lt)}`)
  console.log(`Strony produktowe (/products/): ${lt.product ?? 0}`)
  console.log(`Odpadłoby przy gate (non_shopify URL-i): ${dist.non_shopify ?? 0}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
