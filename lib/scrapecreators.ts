/**
 * Klient Scrape Creators API (TikTok Shop) — SERWER ONLY (używa SCRAPECREATORS_API_KEY).
 * 1 request = 1 credit (~$0.002). Rynki LIVE: US/GB/DE/FR/IT/ES/IE + Azja/BR/MX/JP.
 * PL NIEDOSTĘPNE (TikTok Shop nie działa w Polsce).
 */
const BASE = 'https://api.scrapecreators.com'

export const SHOP_REGIONS = ['US', 'GB', 'DE', 'FR', 'IT', 'ES', 'IE', 'BR', 'MX', 'JP', 'SG', 'MY', 'PH', 'TH', 'VN', 'ID'] as const
export type ShopRegion = (typeof SHOP_REGIONS)[number]
const CURRENCY: Record<string, string> = { US: '$', GB: '£', IE: '€', DE: '€', FR: '€', IT: '€', ES: '€', BR: 'R$', MX: '$', JP: '¥' }

export interface ShopProduct {
  productId: string
  title: string
  description: string
  imageUrl?: string
  videoUrl?: string
  price: number
  currency: string
  rating?: number
  reviewCount?: number
  soldCount: number
  estRevenue: number
  sellerId?: string
  shopName?: string
  shopLogo?: string
  category?: string
  productUrl?: string
  region: string
}

async function scGet(path: string, params: Record<string, string | number>): Promise<Record<string, unknown> | null> {
  const key = process.env.SCRAPECREATORS_API_KEY
  if (!key) return null
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()
  try {
    const r = await fetch(`${BASE}${path}?${qs}`, { headers: { 'x-api-key': key }, signal: AbortSignal.timeout(45000) })
    if (!r.ok) return null
    return await r.json() as Record<string, unknown>
  } catch { return null }
}

function num(v: unknown): number { const n = typeof v === 'string' ? parseFloat(v) : Number(v); return Number.isFinite(n) ? n : 0 }

function normalize(p: Record<string, unknown>, region: string): ShopProduct {
  const price = num((p.product_price_info as Record<string, unknown>)?.sale_price_decimal)
  const sold = num((p.sold_info as Record<string, unknown>)?.sold_count)
  const rate = p.rate_info as Record<string, unknown> | undefined
  const seller = p.seller_info as Record<string, unknown> | undefined
  const img = (p.image as Record<string, unknown>)?.url_list as string[] | undefined
  const vid = (p.video as Record<string, unknown>)?.url_list as string[] | undefined
  const seo = p.seo_url as Record<string, unknown> | undefined
  return {
    productId: String(p.product_id ?? ''),
    title: String(p.title ?? ''),
    description: String(p.product_description ?? '') || '',
    imageUrl: img?.[0],
    videoUrl: vid?.[0],
    price,
    currency: CURRENCY[region] ?? '$',
    rating: rate?.score != null ? num(rate.score) : undefined,
    reviewCount: rate?.review_count != null ? num(rate.review_count) : undefined,
    soldCount: sold,
    estRevenue: Math.round(price * sold),
    sellerId: seller?.seller_id ? String(seller.seller_id) : undefined,
    shopName: seller?.shop_name ? String(seller.shop_name) : undefined,
    shopLogo: seller?.shop_logo ? String(seller.shop_logo) : undefined,
    category: undefined,
    productUrl: seo?.canonical_url ? String(seo.canonical_url) : undefined,
    region,
  }
}

export interface ShopVideo {
  itemId: string; url?: string; cover?: string; contentUrl?: string
  views: number; likes: number; postedAt?: string; caption: string
  authorName: string; authorUrl?: string; authorAvatar?: string
}

/** Wideo napędzające sprzedaż produktu (affiliate/related). 1 credit. */
export async function getProductVideos(productUrl: string, region = 'US'): Promise<ShopVideo[]> {
  const d = await scGet('/v1/tiktok/product', { url: productUrl, region })
  const rv = (d?.related_videos as Record<string, unknown>[]) ?? []
  return rv.map((v) => ({
    itemId: String(v.item_id ?? ''),
    url: v.url ? String(v.url) : undefined,
    cover: v.cover_image_url ? String(v.cover_image_url) : undefined,
    contentUrl: v.content_url ? String(v.content_url) : undefined,
    views: num(v.play_count), likes: num(v.like_count),
    postedAt: v.upload_time ? new Date(num(v.upload_time) * 1000).toISOString() : undefined,
    caption: String(v.title ?? ''),
    authorName: String(v.author_name ?? ''),
    authorUrl: v.author_url ? String(v.author_url) : undefined,
    authorAvatar: v.author_avatar_url ? String(v.author_avatar_url) : undefined,
  })).filter((v) => v.itemId)
}

export interface Creator {
  handle: string; nickname: string; followers: number; likes: number; videoCount: number
  verified: boolean; avatar?: string; bio?: string; bioLink?: string; email?: string
}

/** Profil twórcy TikTok. 1 credit. (email wyłuskany z bio jeśli jest; %US niedostępne.) */
export async function getCreator(handle: string): Promise<Creator | null> {
  const d = await scGet('/v1/tiktok/profile', { handle })
  if (!d) return null
  const user = (d.user as Record<string, unknown>) ?? {}
  const stats = (d.stats as Record<string, unknown>) ?? {}
  const bio = String(user.signature ?? '')
  const email = bio.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0]
  const bioLink = user.bioLink && typeof user.bioLink === 'object' ? String((user.bioLink as Record<string, unknown>).link ?? '') : undefined
  return {
    handle: String(user.uniqueId ?? handle), nickname: String(user.nickname ?? ''),
    followers: num(stats.followerCount), likes: num(stats.heart ?? stats.heartCount), videoCount: num(stats.videoCount),
    verified: Boolean(user.verified), avatar: user.avatarMedium ? String(user.avatarMedium) : undefined,
    bio, bioLink, email,
  }
}

/** Search produktów TikTok Shop dla frazy + regionu. 1 credit/strona. */
export async function searchShop(query: string, region: string = 'US', page = 1): Promise<{ products: ShopProduct[]; total: number }> {
  const d = await scGet('/v1/tiktok/shop/search', { query, region, page })
  const raw = (d?.products as Record<string, unknown>[]) ?? []
  const products = raw.map((p) => normalize(p, region)).filter((p) => p.productId)
  return { products, total: Number(d?.total_products ?? products.length) }
}
