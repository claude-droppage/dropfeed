export type OfferType = 'physical' | 'digital' | 'app' | 'service' | 'course' | 'other'
export type AdFormat = 'video' | 'image'
export type AdAngle = 'ugc' | 'demo' | 'problem-solution' | 'testimonial' | 'lifestyle' | 'comparison' | 'other'
export type Niche = 'beauty' | 'kitchen' | 'pet' | 'fitness' | 'gadgets' | 'home' | 'fashion' | 'health' | 'tech' | 'education' | 'baby' | 'auto' | 'garden' | 'office' | 'other'
export type Plan = 'free' | 'pro'
export type SwipeDirection = 'skip' | 'save' | 'deep'
export type FeedMode = 'products' | 'inspirations' | 'hot'

export interface Brand {
  id: string
  name: string
  fbPageId?: string
  igHandle?: string
  igFollowers?: number
  storeUrl?: string
  country?: string
  avatarInitials: string
  /** logo marki (profilówka strony FB) zhostowane na R2; brak → fallback na inicjały */
  logoUrl?: string
}

export interface Product {
  id: string
  brandId: string
  name: string
  offerType: OfferType
  niche: Niche
  category: string
  priceInStore?: number
  offerUrl?: string
  thumbnail?: string
  /** 0–1, confidence of landing-scraped fields (name, price) */
  confidence: number
}

export interface Ad {
  id: string
  brandId: string
  productId?: string
  format: AdFormat
  /** thumbnail URL for image; thumbnail/poster URL for video */
  creativeUrl: string
  /** poster/still URL (R2) — używany jako statyczna miniatura, zwł. dla wideo */
  thumbUrl?: string
  angle?: AdAngle
  hook?: string
  copy?: string
  cta?: string
  /** ISO date string */
  startDate: string
  isActive: boolean
  /** list of ISO 3166-1 alpha-2 country codes */
  countries: string[]
  heatScore: number
  /** total active ads count for this brand (shown in UI as "12 aktywnych reklam marki") */
  adVariantsCount: number
  /** days since brand started actively scaling; undefined = not scaling */
  scalingSince?: number
  offerType: OfferType
  /** 0–1, confidence of offer name from landing */
  confidence: number
  ageInDays: number
  /** new ad variants published by this brand in last 14 days (used in heat score) */
  newVariantsLast14Days: number
  /** platformy publikacji z Ad Library (FACEBOOK/INSTAGRAM…) */
  platforms?: string[]
  /** liczba wariantów/duplikatów tej kreacji (collation_count) */
  variantsCount?: number
  /** market — kraj wyszukiwania, w którym znaleźliśmy reklamę (PL/US/UK/DE…) */
  country?: string
  /** język reklamy wykryty przez Haiku (pl/en/de…) — pod przyszły filtr */
  language?: string
}

export interface User {
  id: string
  selectedNiches: Niche[]
  plan: Plan
  swipesToday: number
}

export interface Board {
  id: string
  userId: string
  name: string
  createdAt: string
}

export interface SavedItem {
  id: string
  boardId: string
  adId?: string
  productId?: string
  savedAt: string
}

export interface Swipe {
  userId: string
  adId: string
  direction: SwipeDirection
  timestamp: string
}

/** Composite type consumed by the feed UI */
export interface FeedItem {
  ad: Ad
  brand: Brand
  product?: Product
}

/** Rozmiar partii infinite scroll (niewidoczny dla usera). */
export const FEED_PAGE_SIZE = 20

/** Max reklam jednej marki w feedzie (różnorodność). */
export const FEED_PER_BRAND = 10

/** Minimalny staż reklamy (dni od startu) wpuszczanej do feedu — tylko
 *  sprawdzone winnery (staż = sygnał, że sprzedają). FAZA B: 7. */
export const FEED_MIN_AGE_DAYS = 7

// ── Logika feedu (PRD §11) — wszystko strojalne ──────────────────────────
/** Bonus heat-equivalent dla reklam z preferowanych nisz (miękkie ważenie). */
export const FEED_NICHE_WEIGHT = 8
/** Amplituda jittera z seeda (umiarkowana rotacja kolejności między wejściami). */
export const FEED_JITTER_AMP = 12
/** Co ile pozycji wstrzyknąć reklamę spoza preferowanych nisz (odkrycie). */
export const FEED_DISCOVERY_EVERY = 10

export interface FeedPageParams {
  offset: number
  limit: number
  /** filtr kategorii oferty z onboardingu; null/[] = bez filtra */
  offerTypes?: OfferType[] | null
  /** seed sesji — stała rotacja w obrębie jednego scrollowania (bez duplikatów) */
  seed?: number
  /** preferowane nisze z onboardingu (miękkie ważenie + różnorodność) */
  preferredNiches?: Niche[] | null
}

export interface FeedPage {
  items: FeedItem[]
  hasMore: boolean
}

// ════════════════════════════════════════════════════════════════════════
// Nowe ekrany: Produkty + TikTok Shop. MOCK na teraz (backend fazami później),
// ale za tym samym interfejsem `lib/data/source`. Patrz „Roadmapa po launchu"
// i „Silnik odkrywania" w CLAUDE.md.
// ════════════════════════════════════════════════════════════════════════

export type FeedSource = 'facebook' | 'tiktok'

/** Rodzaj sygnału odkrywania (kolor/ton dobiera komponent SignalChip). */
export type DiscoverySignalKind = 'momentum' | 'stores' | 'cross' | 'new' | 'heat'

export interface DiscoverySignal {
  kind: DiscoverySignalKind
  label: string
}

/** Karta produktu „typy dnia" — agregat produkt + sklep + sygnały odkrywania. */
export interface ProductCard {
  id: string
  name: string
  /** domena sklepu, np. rutynaurody.pl */
  shop: string
  niche: Niche
  /** sformatowana cena, np. "89 zł" */
  price: string
  heatScore: number
  /** ile reklam tego produktu */
  adCount: number
  /** placeholder miniatury (mock/fallback) — gdy brak thumbUrl */
  emoji: string
  /** realna miniatura (R2) — gdy jest, UI pokazuje obraz zamiast emoji */
  thumbUrl?: string
  /** staż najstarszej aktywnej reklamy (dni aktywności) */
  daysActive?: number
  /** dominujący rynek reklam (ISO kraj) — flaga na karcie */
  country?: string
  /** link do FB Ad Library („otwórz reklamę") */
  adLibraryUrl?: string
  signals: DiscoverySignal[]
}

/** Miniatura reklamy w deep-dive produktu. */
export interface AdMini {
  id: string
  emoji: string
  /** realna miniatura (R2) — gdy jest, UI pokazuje obraz zamiast emoji */
  thumbUrl?: string
  heatScore: number
  format: AdFormat
}

export interface ProductDetail extends ProductCard {
  status: 'active' | 'inactive'
  /** staż najstarszej reklamy (dni) */
  oldestAdDays: number
  /** rynki jako flagi emoji, np. ['🇵🇱','🇩🇪'] */
  markets: string[]
  /** opis formatów, np. "wideo + foto" */
  formats: string
  ads: AdMini[]
  adLibraryUrl: string
}

export type ShopMarket = 'PL' | 'US'

export interface TikTokShopItem {
  /** product_id — klik → /shop/[id] (deep-dive) */
  id: string
  rank: number
  name: string
  emoji: string
  /** realny obraz produktu (TikTok CDN) — gdy jest, UI pokazuje go zamiast emoji */
  thumbUrl?: string
  /** liczba sprzedanych, sformatowana, np. "14,2 tys." */
  sold: string
  /** cena, np. "$16.99" */
  price?: string
  /** link do produktu w TikTok Shop (klik → karta; deep-dive z wideo = T3) */
  url?: string
  /** trend, np. "▲ 32%" lub "nowy" (pusty, dopóki nie ma ≥2 snapshotów) */
  trend: string
}

export interface TikTokShopResult {
  market: ShopMarket
  /** US = live (realne liczby sprzedaży), PL = fresh (świeży rynek od 15.06) */
  state: 'live' | 'fresh'
  items: TikTokShopItem[]
  /** PL — „pierwsze ruchy" na świeżym rynku */
  firstMoves?: TikTokShopItem[]
}

/** Powiązane wideo (v0: wyszukane po nazwie produktu — NIE precyzyjne linkowanie). */
export interface TikTokShopVideo {
  videoId: string
  url?: string
  coverUrl?: string
  caption?: string
  author?: string
  views?: number
  likes?: number
  comments?: number
  createdAt?: string
}

/** Twardy rdzeń deep-dive (ze scrapeType=product). */
export interface TikTokShopDetail {
  id: string
  title: string
  thumbUrl?: string
  price?: string
  salesVolume?: number
  exactSold?: number
  soldLast30?: number
  rating?: number
  reviewCount?: number
  shopVideoCount?: number
  firstLiveTime?: string
  shopName?: string
  shopFollowers?: number
  shopTotalSold?: number
  productUrl?: string
}

export interface TikTokShopProductView {
  detail: TikTokShopDetail
  videos: TikTokShopVideo[]
  /** true → on-demand enrich (cache ~2 tyg wygasł / brak wideo) */
  videosStale: boolean
}
