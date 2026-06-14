/**
 * Implementacja warstwy danych na danych mockowych (lib/data/mock.ts).
 * Sygnatury identyczne z source.supabase.ts — funkcje są async, żeby kontrakt
 * był ten sam niezależnie od źródła (przełącznik NEXT_PUBLIC_DATA_SOURCE).
 */

import { brands, products, ads } from './mock'
import type { Brand, Product, Ad, FeedPage, FeedPageParams } from '@/lib/types'

const allItems = ads
  .map((ad) => ({
    ad,
    brand: brands.find((b) => b.id === ad.brandId)!,
    product: products.find((p) => p.id === ad.productId),
  }))
  .sort((a, b) => b.ad.heatScore - a.ad.heatScore)

export async function getFeedPage(
  { offset, limit, offerTypes }: FeedPageParams,
): Promise<FeedPage> {
  let pool = allItems
  if (offerTypes && offerTypes.length) {
    pool = pool.filter((it) => offerTypes.includes(it.ad.offerType))
  }
  const items = pool.slice(offset, offset + limit)
  return { items, hasMore: offset + limit < pool.length }
}

export async function getBrandActiveAdCount(brandId: string): Promise<number> {
  return ads.filter((a) => a.brandId === brandId).length
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
