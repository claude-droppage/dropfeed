import { getDailyProducts } from '@/lib/data/source'
import ProductsView from '@/components/products/ProductsView'

export default async function ProductsPage() {
  const products = await getDailyProducts()
  const dateLabel = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long' }).format(new Date())
  return <ProductsView products={products} dateLabel={dateLabel} />
}
