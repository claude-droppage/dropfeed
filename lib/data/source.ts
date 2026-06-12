/**
 * Data abstraction layer — the only place UI components read data from.
 *
 * Currently backed by local mock data (Etap 2).
 * When Supabase is ready (Etap 1), replace the implementations here
 * without touching any UI component.
 */

import { brands, products, ads } from './mock'
import type { FeedItem, Brand, Product, Ad } from '@/lib/types'

export function getFeedItems(): FeedItem[] {
  return ads.map(ad => ({
    ad,
    brand: brands.find(b => b.id === ad.brandId)!,
    product: products.find(p => p.id === ad.productId),
  }))
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
