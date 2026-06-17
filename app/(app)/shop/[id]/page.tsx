import { notFound } from 'next/navigation'
import { getTikTokShopProduct } from '@/lib/data/source'
import ShopDeepDive from '@/components/shop/ShopDeepDive'

export default async function ShopProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const view = await getTikTokShopProduct(id)
  if (!view) notFound()
  return <ShopDeepDive initial={view} productId={id} />
}
