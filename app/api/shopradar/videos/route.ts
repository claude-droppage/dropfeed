import { NextRequest, NextResponse } from 'next/server'
import { getProductVideos } from '@/lib/scrapecreators'
import { createAdminClient } from '@/lib/supabase/admin'

// Wideo napędzające sprzedaż produktu. Cache w shop_products.videos_cache (re-open = free).
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  const region = req.nextUrl.searchParams.get('region') ?? 'US'
  const productId = req.nextUrl.searchParams.get('productId')
  if (!url) return NextResponse.json({ videos: [] })
  const admin = createAdminClient()
  // cache hit?
  if (productId) {
    const { data } = await admin.from('shop_products').select('videos_cache').eq('product_id', productId).eq('region', region).maybeSingle()
    if (data?.videos_cache) return NextResponse.json({ videos: data.videos_cache, cached: true })
  }
  const videos = await getProductVideos(url, region)
  if (productId && videos.length) await admin.from('shop_products').update({ videos_cache: videos }).eq('product_id', productId).eq('region', region)
  return NextResponse.json({ videos })
}
