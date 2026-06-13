/**
 * Data abstraction layer — the only place UI components read data from.
 *
 * Currently backed by local mock data (Etap 2).
 * When Supabase is ready (Etap 1), replace the implementations here
 * without touching any UI component.
 */

import { brands, products, ads } from './mock'
import type { FeedItem, Brand, Product, Ad, Niche } from '@/lib/types'

export function getFeedItems(): FeedItem[] {
  return ads.map(ad => ({
    ad,
    brand: brands.find(b => b.id === ad.brandId)!,
    product: products.find(p => p.id === ad.productId),
  }))
}

/**
 * Returns feed items sorted so preferred niches appear first.
 * Items within each group retain original order (by heatScore from mock).
 * When Supabase lands this becomes a weighted query.
 */
export function getNicheWeightedItems(preferredNiches: Niche[]): FeedItem[] {
  const items = getFeedItems()
  if (!preferredNiches.length) return items
  const preferred = new Set<Niche>(preferredNiches)
  return [...items].sort((a, b) => {
    const aNiche = a.product?.niche ?? 'other'
    const bNiche = b.product?.niche ?? 'other'
    return (preferred.has(bNiche) ? 1 : 0) - (preferred.has(aNiche) ? 1 : 0)
  })
}

export function getBrandById(brandId: string): Brand | undefined {
  return brands.find(b => b.id === brandId)
}

export function getAdsByBrand(brandId: string): Ad[] {
  return ads.filter(a => a.brandId === brandId)
}

export function getProductById(productId: string): Product | undefined {
  return products.find(p => p.id === productId)
}

export function getAllBrands(): Brand[] {
  return brands
}
