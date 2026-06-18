import { getTikTokShopFeed } from '@/lib/data/source'
import ShopView from '@/components/shop/ShopView'

export default async function ShopPage() {
  const feed = await getTikTokShopFeed()
  return <ShopView feed={feed} />
}
