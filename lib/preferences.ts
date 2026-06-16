import type { FeedMode, OfferType, Niche } from '@/lib/types'

export type IntentKey = 'physical' | 'digital' | 'inspirations' | 'any'

// Intent → feedMode + offerTypes mapping
export const INTENT_CONFIG: Record<
  IntentKey,
  { label: string; sub: string; feedMode: FeedMode; offerTypes: OfferType[] | null }
> = {
  physical: {
    label: 'Produktów do sprzedania',
    sub: 'Fizyczne produkty — znajdź co sprzedaje konkurencja',
    feedMode: 'products',
    offerTypes: ['physical'],
  },
  digital: {
    label: 'Pomysłów cyfrowych',
    sub: 'Apki, kursy, produkty cyfrowe, usługi',
    feedMode: 'products',
    offerTypes: ['digital', 'app', 'service', 'course'],
  },
  inspirations: {
    label: 'Inspiracji reklamowych',
    sub: 'Angles, hooki i kreacje które działają',
    feedMode: 'inspirations',
    offerTypes: null,
  },
  any: {
    label: 'Rozglądam się ogólnie',
    sub: 'Pokaż mi wszystko co trafia',
    feedMode: 'products',
    offerTypes: null,
  },
}

// Onboarding niche options → Niche[] mapping for personalization
export const ONBOARDING_NICHES: { key: string; label: string; niches: Niche[] }[] = [
  { key: 'beauty',         label: 'beauty',                niches: ['beauty'] },
  { key: 'fitness_health', label: 'zdrowie i fitness',     niches: ['fitness', 'health'] },
  { key: 'home_kitchen',   label: 'dom i kuchnia',         niches: ['home', 'kitchen'] },
  { key: 'pet',            label: 'pet',                   niches: ['pet'] },
  { key: 'gadgets_tech',   label: 'gadżety tech',          niches: ['gadgets', 'tech'] },
  { key: 'kids',           label: 'dziecko i mama',        niches: ['other'] },
  { key: 'moto',           label: 'motoryzacja',           niches: ['other'] },
  { key: 'outdoor',        label: 'outdoor i sport',       niches: ['fitness'] },
  { key: 'jewelry',        label: 'biżuteria i akcesoria', niches: ['fashion'] },
  { key: 'office',         label: 'biuro i organizacja',   niches: ['other'] },
]

/** Resolve selected onboarding niche keys to the Niche[] used for personalization sort */
export function resolveNiches(selectedKeys: string[]): Niche[] {
  return [
    ...new Set(
      selectedKeys.flatMap(
        (k) => ONBOARDING_NICHES.find((n) => n.key === k)?.niches ?? [],
      ),
    ),
  ]
}
