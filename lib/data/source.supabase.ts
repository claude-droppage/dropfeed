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
import { FEED_PER_BRAND, FEED_MIN_AGE_DAYS } from '@/lib/types'
import type { FeedItem, Brand, Product, Ad, Niche, OfferType, FeedPage, FeedPageParams } from '@/lib/types'

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
  { offset, limit, offerTypes }: FeedPageParams,
): Promise<FeedPage> {
  // RPC feed_page: limit FEED_PER_BRAND reklam na markę (różnorodność) + filtr
  // is_active + minimalny staż; embedding marki/produktu po typie zwracanym (ads).
  // RPC zwraca gotowy jsonb (ad + brand + product) w poprawnej kolejności —
  // bez .select()/embeddingu, żeby PostgREST nie zgubił ORDER BY funkcji.
  const { data, error } = await supabase.rpc('feed_page', {
    p_offset: offset,
    p_limit: limit,
    p_per_brand: FEED_PER_BRAND,
    p_offer_types: offerTypes && offerTypes.length ? offerTypes : null,
    p_min_age_days: FEED_MIN_AGE_DAYS,
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
