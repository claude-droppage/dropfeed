/**
 * Detekcja Shopify dla landing URL reklamy (Feature: gate przy ingescie).
 * 2 warstwy:
 *   URL ($0): *.myshopify.com → shopify; /products/ → product; /collections/ → collection.
 *   FETCH (custom domeny): sygnatury cdn.shopify.com / /cdn/shop/ / Shopify.shop / x-shopify-* /
 *     "powered by Shopify". HTTP (z Actiona, NIE Apify). Timeout/blokada → unknown.
 * Zwraca platform: 'shopify' | 'non_shopify' | 'unknown' + landing_type: 'product'|'collection'|'home'|'other'.
 */

export type Platform = 'shopify' | 'non_shopify' | 'unknown'
export type LandingType = 'product' | 'collection' | 'home' | 'other'

export function landingType(url: string | null | undefined): LandingType {
  if (!url) return 'other'
  try {
    const u = new URL(url)
    const p = u.pathname.toLowerCase()
    if (p.includes('/products/')) return 'product'
    if (p.includes('/collections/')) return 'collection'
    if (p === '/' || p === '') return 'home'
    return 'other'
  } catch { return 'other' }
}

/** Warstwa URL ($0). Zwraca 'shopify' (pewne) lub 'unknown' (custom domena → potrzeba fetch). */
export function platformFromUrl(url: string | null | undefined): Platform {
  if (!url) return 'unknown'
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()
    if (host.endsWith('.myshopify.com')) return 'shopify'
    const p = u.pathname.toLowerCase()
    if (p.includes('/products/') || p.includes('/collections/')) return 'shopify'
    return 'unknown'
  } catch { return 'unknown' }
}

/** Sygnatury Shopify w odpowiedzi (nagłówki + HTML). */
export function shopifyFromResponse(headers: Headers, html: string): boolean {
  for (const [k, v] of headers) {
    const kl = k.toLowerCase()
    if (kl.startsWith('x-shopify') || kl === 'x-shopid' || kl === 'x-shardid') return true
    if (kl === 'powered-by' && /shopify/i.test(v)) return true
  }
  return /cdn\.shopify\.com|\/cdn\/shop\/|Shopify\.shop|powered by shopify|shopify\.loadFeatures|window\.Shopify/i.test(html)
}

/** Pełna detekcja: URL-layer, a dla custom domen — fetch (timeout). Zwraca platform+landing_type+flag. */
export async function detectPlatform(url: string | null | undefined, timeoutMs = 8000): Promise<{ platform: Platform; landing_type: LandingType; fetched: boolean }> {
  const lt = landingType(url)
  const byUrl = platformFromUrl(url)
  if (byUrl === 'shopify' || !url) return { platform: byUrl === 'shopify' ? 'shopify' : 'unknown', landing_type: lt, fetched: false }
  // custom domena → fetch i szukaj sygnatur
  const ctrl = new AbortController()
  const to = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 swipespy-shopify-detect' } })
    const html = (await res.text()).slice(0, 200_000)
    return { platform: shopifyFromResponse(res.headers, html) ? 'shopify' : 'non_shopify', landing_type: lt, fetched: true }
  } catch {
    return { platform: 'unknown', landing_type: lt, fetched: false } // timeout/blokada → unknown (domyślnie wpada)
  } finally {
    clearTimeout(to)
  }
}
