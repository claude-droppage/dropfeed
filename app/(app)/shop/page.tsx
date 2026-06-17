import { getTikTokShop } from '@/lib/data/source'
import ShopView from '@/components/shop/ShopView'

export default async function ShopPage() {
  const [us, pl] = await Promise.all([getTikTokShop('US'), getTikTokShop('PL')])
  return <ShopView us={us} pl={pl} />
}
