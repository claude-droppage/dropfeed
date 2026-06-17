/**
 * Implementacja warstwy danych na Supabase (Postgres).
 * Tabele publiczne (brands, products, ads) mają RLS z odczytem dla wszystkich,
 * więc czytamy klientem anon (lib/supabase.ts) — działa i na serwerze, i w
 * przeglądarce. Zapis tych tabel idzie wyłącznie service_role (seed/pipeline).
 *
 * Mapowanie snake_case (DB) → camelCase (lib/types.ts) jest jedynym miejscem,
 * gdzie kształt bazy spotyka się z typami UI.
 */

import { supabase } from '@/lib/supabase'
import { FEED_PER_BRAND, FEED_MIN_AGE_DAYS, FEED_NICHE_WEIGHT, FEED_JITTER_AMP, FEED_DISCOVERY_EVERY } from '@/lib/types'
import type { FeedItem, Brand, Product, Ad, Niche, OfferType, FeedPage, FeedPageParams, ProductCard, ProductDetail, AdMini, DiscoverySignal, AdFormat, TikTokShopResult, TikTokShopItem, ShopMarket } from '@/lib/types'

// ─── Kształt wierszy zwracanych przez Supabase ─────────────────────────────
interface BrandRow {
  id: string
  name: string
  fb_page_id: string | null
  ig_handle: string | null
  ig_followers: number | null
  store_url: string | null
  country: string | null
  avatar_initials: string
  logo_url: string | null
}

interface ProductRow {
  id: string
  brand_id: string
  name: string
  offer_type: Product['offerType']
  niche: Niche
  category: string
  price_in_store: number | string | null
  offer_url: string | null
  thumbnail: string | null
  confidence: number
}

interface AdRow {
  id: string
  brand_id: string
  product_id: string | null
  format: Ad['format']
  creative_url: string
  thumb_url: string | null
  angle: Ad['angle'] | null
  hook: string | null
  copy: string | null
  cta: string | null
  start_date: string
  is_active: boolean
  countries: string[]
  heat_score: number
  ad_variants_count: number
  scaling_since: number | null
  offer_type: Ad['offerType']
  confidence: number
  age_in_days: number
  new_variants_last_14_days: number
  platforms: string[] | null
  variants_count: number | null
  country: string | null
  language: string | null
}

// ─── Mappery DB → typy domenowe ────────────────────────────────────────────
function mapBrand(r: BrandRow): Brand {
  return {
    id: r.id,
    name: r.name,
    fbPageId: r.fb_page_id ?? undefined,
    igHandle: r.ig_handle ?? undefined,
    igFollowers: r.ig_followers ?? undefined,
    storeUrl: r.store_url ?? undefined,
    country: r.country ?? undefined,
    avatarInitials: r.avatar_initials,
    logoUrl: r.logo_url ?? undefined,
  }
}

function mapProduct(r: ProductRow): Product {
  return {
    id: r.id,
    brandId: r.brand_id,
    name: r.name,
    offerType: r.offer_type,
    niche: r.niche,
    category: r.category,
    priceInStore: r.price_in_store != null ? Number(r.price_in_store) : undefined,
    offerUrl: r.offer_url ?? undefined,
    thumbnail: r.thumbnail ?? undefined,
    confidence: r.confidence,
  }
}

function mapAd(r: AdRow): Ad {
  return {
    id: r.id,
    brandId: r.brand_id,
    productId: r.product_id ?? undefined,
    format: r.format,
    creativeUrl: r.creative_url,
    thumbUrl: r.thumb_url ?? undefined,
    angle: r.angle ?? undefined,
    hook: r.hook ?? undefined,
    copy: r.copy ?? undefined,
    cta: r.cta ?? undefined,
    startDate: r.start_date,
    isActive: r.is_active,
    countries: r.countries ?? [],
    heatScore: r.heat_score,
    adVariantsCount: r.ad_variants_count,
    scalingSince: r.scaling_since ?? undefined,
    offerType: r.offer_type,
    confidence: r.confidence,
    ageInDays: r.age_in_days,
    newVariantsLast14Days: r.new_variants_last_14_days,
    platforms: r.platforms ?? [],
    variantsCount: r.variants_count ?? undefined,
    country: r.country ?? undefined,
    language: r.language ?? undefined,
  }
}

function fail(context: string, message: string): never {
  throw new Error(`Supabase (${context}): ${message}`)
}

// ─── Zapytania ─────────────────────────────────────────────────────────────

// Kształt wiersza zwracanego przez RPC feed_page (jsonb: ad + zagnieżdżone).
interface FeedRow extends AdRow {
  brand: BrandRow
  product: ProductRow | null
}

/**
 * Jedna strona feedu (infinite scroll). Sort po heat_score malejąco, stabilny
 * tie-break po id; opcjonalny filtr offerType robiony w zapytaniu (żeby strona
 * nie chudła po stronie klienta). hasMore = czy strona przyszła pełna.
 */
export async function getFeedPage(
  { offset, limit, offerTypes, seed, preferredNiches }: FeedPageParams,
): Promise<FeedPage> {
  // RPC feed_page: limit/markę + przeplatanie + filtr is_active/staż/offerType +
  // seed-jitter (rotacja, stabilna w sesji) + miękkie ważenie nisz + różnorodność.
  // Zwraca gotowy jsonb (ad+brand+product) w kolejności — bez embeddingu PostgREST.
  const { data, error } = await supabase.rpc('feed_page', {
    p_offset: offset,
    p_limit: limit,
    p_per_brand: FEED_PER_BRAND,
    p_offer_types: offerTypes && offerTypes.length ? offerTypes : null,
    p_min_age_days: FEED_MIN_AGE_DAYS,
    p_seed: seed ?? 0,
    p_preferred_niches: preferredNiches && preferredNiches.length ? preferredNiches : null,
    p_niche_weight: FEED_NICHE_WEIGHT,
    p_jitter_amp: FEED_JITTER_AMP,
    p_discovery_every: FEED_DISCOVERY_EVERY,
  })

  if (error) fail('getFeedPage', error.message)

  const items = (data as unknown as FeedRow[]).map((row) => ({
    ad: mapAd(row),
    brand: mapBrand(row.brand),
    product: row.product ? mapProduct(row.product) : undefined,
  }))
  return { items, hasMore: items.length === limit }
}

/** Snapshoty osi skalowania (liczba aktywnych reklam marki w czasie). */
export async function getBrandSnapshots(brandId: string): Promise<{ day: string; count: number }[]> {
  const { data, error } = await supabase
    .from('brand_daily_snapshot')
    .select('day, active_ads_count')
    .eq('brand_id', brandId)
    .order('day', { ascending: true })
  if (error) fail('getBrandSnapshots', error.message)
  return (data as { day: string; active_ads_count: number }[]).map((r) => ({ day: r.day, count: r.active_ads_count }))
}

/** Liczba aktywnych reklam marki — sam COUNT, bez pobierania wierszy (deep dive). */
export async function getBrandActiveAdCount(brandId: string): Promise<number> {
  const { count, error } = await supabase
    .from('ads')
    .select('id', { count: 'exact', head: true })
    .eq('brand_id', brandId)
    .eq('is_active', true)
  if (error) fail('getBrandActiveAdCount', error.message)
  return count ?? 0
}

export async function getBrandById(brandId: string): Promise<Brand | undefined> {
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .maybeSingle()

  if (error) fail('getBrandById', error.message)
  return data ? mapBrand(data as BrandRow) : undefined
}

export async function getAdsByBrand(brandId: string): Promise<Ad[]> {
  const { data, error } = await supabase
    .from('ads')
    .select('*')
    .eq('brand_id', brandId)
    .order('heat_score', { ascending: false })

  if (error) fail('getAdsByBrand', error.message)
  return (data as AdRow[]).map(mapAd)
}

export async function getProductById(
  productId: string,
): Promise<Product | undefined> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .maybeSingle()

  if (error) fail('getProductById', error.message)
  return data ? mapProduct(data as ProductRow) : undefined
}

export async function getAllBrands(): Promise<Brand[]> {
  const { data, error } = await supabase.from('brands').select('*').order('name')
  if (error) fail('getAllBrands', error.message)
  return (data as BrandRow[]).map(mapBrand)
}

// ── Produkty (Faza 1) — realne, z RPC discover_products / product_detail ───

// ── TikTok Shop (Faza 3, T2) — realne USA z tiktok_shop_products ───────────
function formatSold(n: number | null): string {
  if (!n) return '0'
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.', ',')} tys.`
  return String(n)
}

export async function getTikTokShop(market: ShopMarket): Promise<TikTokShopResult> {
  // PL — świeży rynek (TikTok Shop PL od 15.06), brak realnych bestsellerów
  if (market !== 'US') return { market: 'PL', state: 'fresh', items: [], firstMoves: [] }

  const { data, error } = await supabase
    .from('tiktok_shop_products')
    .select('product_id,title,image_url,product_url,current_price,sales_volume')
    .eq('region', 'us')
    .order('sales_volume', { ascending: false }) // realny ranking sprzedaży
    .limit(30)
  if (error || !data) return { market: 'US', state: 'live', items: [] } // graceful

  const items: TikTokShopItem[] = data.map((r, idx) => ({
    rank: idx + 1,
    name: r.title ?? '',
    emoji: '🛒',
    thumbUrl: r.image_url ?? undefined,
    sold: formatSold(r.sales_volume),
    price: r.current_price != null ? `$${r.current_price}` : undefined,
    url: r.product_url ?? undefined,
    trend: '', // brak — doliczymy z ≥2 snapshotów (jak FB momentum)
  }))
  return { market: 'US', state: 'live', items }
}

const NICHE_EMOJI: Record<string, string> = {
  beauty: '💄', kitchen: '🍳', pet: '🐶', fitness: '🏋️', gadgets: '🔌', home: '🏠',
  fashion: '👗', health: '💊', tech: '💻', education: '📚', baby: '🍼', auto: '🚗',
  garden: '🌿', office: '🗂️', other: '📦',
}
const nicheEmoji = (n: string) => NICHE_EMOJI[n] ?? '📦'

/** domena sklepu z store_url; fallback = nazwa marki */
function shopLabel(storeUrl: string | null, brandName: string): string {
  if (!storeUrl) return brandName
  const host = storeUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
  return host || brandName
}

const FLAG: Record<string, string> = { PL: '🇵🇱', US: '🇺🇸', GB: '🇬🇧', UK: '🇬🇧', DE: '🇩🇪', FR: '🇫🇷', ES: '🇪🇸', IT: '🇮🇹' }
const flag = (code: string) => FLAG[code?.toUpperCase()] ?? '🌍'

function formatsLabel(formats: string[] | null): string {
  if (!formats || !formats.length) return '—'
  const has = (f: string) => formats.includes(f)
  if (has('video') && has('image')) return 'wideo + foto'
  if (has('video')) return 'wideo'
  if (has('image')) return 'foto'
  return formats.join(', ')
}

const priceLabel = (p: number | null) => (p != null ? `${Math.round(p)} zł` : '')

const fbAdLibrary = (name: string) =>
  `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=${encodeURIComponent(name)}`

interface RawDiscover {
  id: string; name: string; niche: string; price_in_store: number | null
  brand_name: string; store_url: string | null; ad_count: number; heat: number
  newest_age: number | null; oldest_age: number | null; country: string | null
  has_foreign: boolean; rep_thumb: string | null
  stores_count: number; momentum_days: number; momentum_delta: number
}

function buildSignals(r: RawDiscover): DiscoverySignal[] {
  const out: DiscoverySignal[] = []
  if (r.momentum_days >= 1 && r.momentum_delta > 0)
    out.push({ kind: 'momentum', label: `▲ +${r.momentum_delta} reklam / ${r.momentum_days} dni` })
  if (r.stores_count >= 2) out.push({ kind: 'stores', label: `${r.stores_count} sklepów reklamują` })
  if (r.has_foreign) out.push({ kind: 'cross', label: 'wygrywa za granicą' })
  if (out.length < 3 && r.newest_age != null && r.newest_age <= 14)
    out.push({ kind: 'new', label: `▲ świeże — ${r.newest_age} dni` })
  return out.slice(0, 3)
}

function toProductCard(r: RawDiscover): ProductCard {
  return {
    id: r.id,
    name: r.name,
    shop: shopLabel(r.store_url, r.brand_name),
    niche: r.niche as Niche,
    price: priceLabel(r.price_in_store),
    heatScore: r.heat,
    adCount: r.ad_count,
    emoji: nicheEmoji(r.niche),
    thumbUrl: r.rep_thumb ?? undefined,
    daysActive: r.oldest_age ?? undefined,
    country: r.country ?? undefined,
    adLibraryUrl: fbAdLibrary(r.name),
    signals: buildSignals(r),
  }
}

export async function getDailyProducts(): Promise<ProductCard[]> {
  const { data, error } = await supabase.rpc('discover_products', { p_limit: 40 })
  if (error || !data) return [] // graceful: cienko z danymi → mniej (zero) produktów
  return (data as RawDiscover[]).map(toProductCard)
}

interface RawDetail {
  id: string; name: string; niche: string; price: number | null; offer_url: string | null
  brand_name: string; store_url: string | null; ad_count: number; heat: number | null
  oldest_age: number | null; newest_age: number | null; markets: string[] | null
  formats: string[] | null
  ads: { id: string; thumb_url: string | null; heat: number; format: AdFormat }[]
}

export async function getProductDetail(id: string): Promise<ProductDetail | undefined> {
  const { data, error } = await supabase.rpc('product_detail', { p_id: id })
  if (error || !data) return undefined
  const r = data as RawDetail
  const ads: AdMini[] = (r.ads ?? []).map((a) => ({
    id: a.id,
    emoji: nicheEmoji(r.niche),
    thumbUrl: a.thumb_url ?? undefined,
    heatScore: Math.round(a.heat ?? 0),
    format: a.format,
  }))
  return {
    id: r.id,
    name: r.name,
    shop: shopLabel(r.store_url, r.brand_name),
    niche: r.niche as Niche,
    price: priceLabel(r.price),
    heatScore: Math.round(r.heat ?? 0),
    adCount: r.ad_count,
    emoji: nicheEmoji(r.niche),
    thumbUrl: ads[0]?.thumbUrl,
    signals: [],
    status: r.ad_count > 0 ? 'active' : 'inactive',
    oldestAdDays: r.oldest_age ?? 0,
    markets: (r.markets ?? ['PL']).map(flag),
    formats: formatsLabel(r.formats),
    ads,
    adLibraryUrl: `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=${encodeURIComponent(r.name)}`,
  }
}
