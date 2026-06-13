/**
 * Implementacja warstwy danych na danych mockowych (lib/data/mock.ts).
 * Sygnatury identyczne z source.supabase.ts — funkcje są async, żeby kontrakt
 * był ten sam niezależnie od źródła (przełącznik NEXT_PUBLIC_DATA_SOURCE).
 */

import { brands, products, ads } from './mock'
import type { FeedItem, Brand, Product, Ad, Niche } from '@/lib/types'

export async function getFeedItems(): Promise<FeedItem[]> {
  return ads
    .map((ad) => ({
      ad,
      brand: brands.find((b) => b.id === ad.brandId)!,
      product: products.find((p) => p.id === ad.productId),
    }))
    .sort((a, b) => b.ad.heatScore - a.ad.heatScore)
}

export async function getNicheWeightedItems(
  preferredNiches: Niche[],
): Promise<FeedItem[]> {
  const items = await getFeedItems()
  if (!preferredNiches.length) return items
  const preferred = new Set<Niche>(preferredNiches)
  return [...items].sort((a, b) => {
    const aNiche = a.product?.niche ?? 'other'
    const bNiche = b.product?.niche ?? 'other'
    return (preferred.has(bNiche) ? 1 : 0) - (preferred.has(aNiche) ? 1 : 0)
  })
}

export async function getBrandById(brandId: string): Promise<Brand | undefined> {
  return brands.find((b) => b.id === brandId)
}

export async function getAdsByBrand(brandId: string): Promise<Ad[]> {
  return ads
    .filter((a) => a.brandId === brandId)
    .sort((a, b) => b.heatScore - a.heatScore)
}

export async function getProductById(
  productId: string,
): Promise<Product | undefined> {
  return products.find((p) => p.id === productId)
}

export async function getAllBrands(): Promise<Brand[]> {
  return brands
}
