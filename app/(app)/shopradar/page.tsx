import { searchShop } from '@/lib/scrapecreators'
import { createAdminClient } from '@/lib/supabase/admin'
import ShopRadarView from '@/components/shopradar/ShopRadarView'

// ShopRadar — research TikTok Shop (Scrape Creators). Search server-side (klucz
// server-only), zapis produktów + snapshot (Movers), render leaderboardu.
export const dynamic = 'force-dynamic'

export default async function ShopRadarPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams
  const q = (sp.q ?? '').trim()
  const region = sp.region ?? 'US'

  let products: import('@/lib/scrapecreators').ShopProduct[] = []
  if (q) {
    const res = await searchShop(q, region, 1)
    products = res.products
    if (products.length) {
      const admin = createAdminClient()
      const now = new Date().toISOString()
      await admin.from('shop_products').upsert(
        products.map((p) => ({
          product_id: p.productId, region: p.region, title: p.title, description: p.description,
          image_url: p.imageUrl, video_url: p.videoUrl, price: p.price, currency: p.currency,
          rating: p.rating, review_count: p.reviewCount, sold_count: p.soldCount, est_revenue: p.estRevenue,
          seller_id: p.sellerId, shop_name: p.shopName, shop_logo: p.shopLogo, product_url: p.productUrl, last_seen: now,
        })), { onConflict: 'product_id,region' },
      )
      await admin.from('shop_snapshots').upsert(
        products.map((p) => ({ product_id: p.productId, region: p.region, captured_at: now, sold_count: p.soldCount, price: p.price })),
        { onConflict: 'product_id,region,captured_at' },
      )
    }
  }

  return <ShopRadarView query={q} region={region} products={products} />
}
