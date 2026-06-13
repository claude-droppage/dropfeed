import { useState, useEffect, useCallback } from 'react'
import type { FeedMode, OfferType, Niche } from '@/lib/types'

const STORAGE_KEY = 'dropfeed_prefs_v1'

export type IntentKey = 'physical' | 'digital' | 'inspirations' | 'any'

export interface UserPreferences {
  intent: IntentKey
  niches: string[] // onboarding niche keys, e.g. ['beauty', 'fitness_health']
  feedMode: FeedMode
  offerTypes: OfferType[] | null // null = no filter
}

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

export function loadPreferences(): UserPreferences | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as UserPreferences) : null
  } catch {
    return null
  }
}

export function savePreferences(prefs: UserPreferences): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {}
}

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

export function usePreferences() {
  const [prefs, setPrefs] = useState<UserPreferences | null | undefined>(undefined)

  useEffect(() => {
    setPrefs(loadPreferences())
  }, [])

  const save = useCallback((p: UserPreferences) => {
    savePreferences(p)
    setPrefs(p)
  }, [])

  return { prefs, save }
}
