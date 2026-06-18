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
import type { FeedItem, Brand, Product, Ad, Niche, OfferType, FeedPage, FeedPageParams, ProductCard, ProductDetail, AdMini, DiscoverySignal, AdFormat, TikTokShopResult, TikTokShopItem, ShopMarket, TikTokShopProductView, TikTokShopVideo, TikTokShopCreator, PropozycjaItem, PropozycjeResult, ShopFeed } from '@/lib/types'

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

  // RPC: produkty + seria snapshotów (sparkline) + wzrost% + liczba twórców
  const { data, error } = await supabase.rpc('tiktok_shop_bestsellers', { p_region: 'us', p_limit: 40 })
  if (error || !Array.isArray(data)) return { market: 'US', state: 'live', items: [] } // graceful

  const items: TikTokShopItem[] = (data as Record<string, unknown>[]).map((r, idx) => ({
    id: r.product_id as string,
    rank: idx + 1,
    name: (r.title as string) ?? '',
    emoji: '🛒',
    thumbUrl: (r.image_url as string) ?? undefined,
    sold: formatSold(r.sales_volume as number),
    price: r.current_price != null ? `$${r.current_price}` : undefined,
    url: (r.product_url as string) ?? undefined,
    trend: r.growth_pct != null ? `▲ ${r.growth_pct}%` : '',
    rating: r.rating != null ? Number(r.rating) : undefined,
    reviewCount: (r.review_count as number) ?? undefined,
    growthPct: r.growth_pct != null ? Number(r.growth_pct) : null,
    salesSeries: (r.sales_series as number[]) ?? null,
    creatorsCount: (r.creators_count as number) ?? undefined,
  }))
  return { market: 'US', state: 'live', items }
}

// Propozycje (rdzeń) — RPC propozycje_tiktok zwraca gotowy jsonb. Mapujemy snake→camel.
function mapPropozycja(r: Record<string, unknown>): PropozycjaItem {
  return {
    productId: r.product_id as string,
    title: (r.title as string) ?? '',
    imageUrl: (r.image_url as string) ?? undefined,
    productUrl: (r.product_url as string) ?? undefined,
    price: r.price != null ? Number(r.price) : undefined,
    rating: r.rating != null ? Number(r.rating) : undefined,
    reviewCount: (r.review_count as number) ?? undefined,
    salesVolume: (r.sales_volume as number) ?? undefined,
    rank: (r.rank as number) ?? undefined,
    rankDelta: (r.rank_delta as number) ?? null,
    sold24h: (r.sold_24h as number) ?? null,
    sold7d: r.sold_7d != null ? Number(r.sold_7d) : null,
    nSnaps: (r.n_snaps as number) ?? 0,
    isDouble: Boolean(r.is_double),
    adCount: (r.ad_count as number) ?? 0,
    isFresh: Boolean(r.is_fresh),
    daysTracked: (r.days_tracked as number) ?? 0,
    series: (r.series as { date: string; daily_units: number | null }[]) ?? null,
    isSaturated: r.is_saturated != null ? Boolean(r.is_saturated) : undefined,
    isGem: r.is_gem != null ? Boolean(r.is_gem) : undefined,
    signal: (r.signal as 'rank' | 'fresh' | 'double' | 'rise') ?? undefined,
  }
}

export async function getTikTokShopFeed(): Promise<ShopFeed> {
  const empty: ShopFeed = { gems: [], all: [], counts: { tracked: 0, gems: 0 } }
  const { data, error } = await supabase.rpc('tiktok_shop_feed', { p_region: 'us' })
  if (error || !data) return empty
  const d = data as Record<string, unknown>
  const c = (d.counts ?? {}) as Record<string, unknown>
  return {
    gems: Array.isArray(d.gems) ? (d.gems as Record<string, unknown>[]).map(mapPropozycja) : [],
    all: Array.isArray(d.all) ? (d.all as Record<string, unknown>[]).map(mapPropozycja) : [],
    counts: { tracked: (c.tracked as number) ?? 0, gems: (c.gems as number) ?? 0 },
  }
}

export async function getPropozycje(): Promise<PropozycjeResult> {
  const empty: PropozycjeResult = { typDnia: null, movers: [], trackRecord: null, meta: { qualifying: 0, activeCount: 0, freshCount: 0 } }
  const { data, error } = await supabase.rpc('propozycje_tiktok', { p_region: 'us' })
  if (error || !data) return empty
  const d = data as Record<string, unknown>
  const m = (d.meta ?? {}) as Record<string, unknown>
  return {
    typDnia: d.typ_dnia ? mapPropozycja(d.typ_dnia as Record<string, unknown>) : null,
    movers: Array.isArray(d.movers) ? (d.movers as Record<string, unknown>[]).map(mapPropozycja) : [],
    trackRecord: (d.track_record as string) ?? null,
    meta: {
      updatedDay: (m.updated_day as string) ?? undefined,
      qualifying: (m.qualifying as number) ?? 0,
      activeCount: (m.active_count as number) ?? 0,
      freshCount: (m.fresh_count as number) ?? 0,
    },
  }
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

// Deep-dive TikTok Shop (T3b): produkt + cache wideo + flaga staleness (~2 tyg).
// Enrich on-demand robi Edge Function shop-enrich (Apify); tu tylko odczyt.
const TT_VIDEO_STALE_MS = 14 * 24 * 3600 * 1000

export async function getTikTokShopProduct(id: string): Promise<TikTokShopProductView | null> {
  const { data: p, error } = await supabase.from('tiktok_shop_products').select('*').eq('product_id', id).maybeSingle()
  if (error || !p) return null
  const { data: vids } = await supabase
    .from('tiktok_shop_video').select('*').eq('product_id', id).order('views', { ascending: false }).limit(8)
  const videos: TikTokShopVideo[] = (vids ?? []).map((v) => ({
    videoId: v.video_id, url: v.url ?? undefined, coverUrl: v.cover_url ?? undefined,
    caption: v.caption ?? undefined, author: v.author ?? undefined,
    authorAvatar: v.author_avatar ?? undefined, authorFollowers: v.author_followers ?? undefined,
    views: v.views ?? undefined, likes: v.likes ?? undefined, comments: v.comments ?? undefined,
    createdAt: v.created_at ?? undefined,
  }))
  // twórcy: zgrupuj wideo po autorze, sumuj views, sort DESC
  const byAuthor = new Map<string, TikTokShopCreator>()
  for (const v of videos) {
    if (!v.author) continue
    const c = byAuthor.get(v.author) ?? { handle: v.author, avatar: v.authorAvatar, followers: v.authorFollowers, views: 0 }
    c.views += v.views ?? 0
    byAuthor.set(v.author, c)
  }
  const creators = [...byAuthor.values()].sort((a, b) => b.views - a.views)
  const videosStale = !p.videos_fetched_at || Date.now() - Date.parse(p.videos_fetched_at) > TT_VIDEO_STALE_MS || videos.length === 0
  return {
    detail: {
      id: p.product_id, title: p.title ?? '', thumbUrl: p.image_url ?? undefined,
      price: p.current_price != null ? `$${p.current_price}` : undefined,
      salesVolume: p.sales_volume ?? undefined, exactSold: p.exact_sold_count ?? undefined,
      soldLast30: p.sold_last_30 ?? undefined, rating: p.rating ?? undefined, reviewCount: p.review_count ?? undefined,
      shopVideoCount: p.shop_video_count ?? undefined, firstLiveTime: p.first_live_time ?? undefined,
      shopName: p.shop_name ?? p.seller_name ?? undefined, shopFollowers: p.shop_followers ?? undefined,
      shopTotalSold: p.shop_total_sold ?? undefined, productUrl: p.product_url ?? undefined,
    },
    videos,
    creators,
    videosStale,
  }
}
