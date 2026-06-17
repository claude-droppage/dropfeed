// Mock danych ekranu „Produkty" (typy dnia) + deep-dive. Treść poglądowa,
// zgodna z szablonem wizualnym. Backend wpina się później za interfejsem
// lib/data/source (getDailyProducts / getProductDetail).
import type { ProductCard, ProductDetail, AdMini, FeedSource } from '@/lib/types'

const PRODUCTS: ProductCard[] = [
  {
    id: 'masazer-limfatyczny',
    name: 'Masażer limfatyczny twarzy',
    shop: 'rutynaurody.pl',
    niche: 'beauty',
    price: '89 zł',
    heatScore: 88,
    adCount: 12,
    emoji: '🧴',
    signals: [
      { kind: 'momentum', label: '▲ +9 reklam / 5 dni' },
      { kind: 'stores', label: '23 sklepy reklamują' },
      { kind: 'cross', label: '🇺🇸→🇵🇱 wchodzi do PL' },
    ],
  },
  {
    id: 'mini-projektor-led',
    name: 'Mini projektor LED 1080p',
    shop: 'techbox.pl',
    niche: 'tech',
    price: '199 zł',
    heatScore: 81,
    adCount: 24,
    emoji: '📽️',
    signals: [
      { kind: 'momentum', label: '▲ +14 reklam / 7 dni' },
      { kind: 'stores', label: '31 sklepów reklamują' },
    ],
  },
  {
    id: 'serum-nad',
    name: 'Serum z peptydami NAD+',
    shop: 'glowup.pl',
    niche: 'beauty',
    price: '129 zł',
    heatScore: 76,
    adCount: 8,
    emoji: '💧',
    signals: [
      { kind: 'stores', label: '8 sklepów reklamują' },
      { kind: 'cross', label: '🇺🇸→🇵🇱 wchodzi do PL' },
    ],
  },
  {
    id: 'szelki-psa-360',
    name: 'Szelki dla psa 360° bez ucisku',
    shop: 'puppup.pl',
    niche: 'pet',
    price: '69 zł',
    heatScore: 64,
    adCount: 6,
    emoji: '🐶',
    signals: [
      { kind: 'new', label: '▲ nowy — 3 dni temu' },
      { kind: 'stores', label: '5 sklepów reklamują' },
    ],
  },
  {
    id: 'tusz-wodoodporny-72h',
    name: 'Tusz wodoodporny 72h',
    shop: 'vitaliaina.pl',
    niche: 'beauty',
    price: '79 zł',
    heatScore: 61,
    adCount: 9,
    emoji: '💄',
    signals: [{ kind: 'stores', label: '9 sklepów reklamują' }],
  },
]

// Stałe miniatury reklam per produkt (poglądowe).
const AD_EMOJIS: Record<string, string[]> = {
  'masazer-limfatyczny': ['💄', '🧴', '✨'],
  'mini-projektor-led': ['📽️', '🎬', '📺'],
  'serum-nad': ['💧', '🧴'],
  'szelki-psa-360': ['🐶', '🦮'],
  'tusz-wodoodporny-72h': ['💄', '👁️'],
}

function buildAds(card: ProductCard): AdMini[] {
  const emojis = AD_EMOJIS[card.id] ?? [card.emoji]
  return emojis.map((emoji, i) => ({
    id: `${card.id}-ad-${i}`,
    emoji,
    heatScore: Math.max(40, card.heatScore - i * 7),
    format: i % 2 === 0 ? 'video' : 'image',
  }))
}

export async function getDailyProducts(_opts?: {
  source?: FeedSource
  niche?: string
  signal?: string
}): Promise<ProductCard[]> {
  return PRODUCTS
}

export async function getProductDetail(id: string): Promise<ProductDetail | undefined> {
  const card = PRODUCTS.find((p) => p.id === id)
  if (!card) return undefined
  return {
    ...card,
    status: 'active',
    oldestAdDays: 47,
    markets: card.niche === 'pet' ? ['🇵🇱'] : ['🇵🇱', '🇩🇪'],
    formats: 'wideo + foto',
    ads: buildAds(card),
    adLibraryUrl: 'https://www.facebook.com/ads/library/',
  }
}
