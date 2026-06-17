import { notFound } from 'next/navigation'
import { getProductDetail } from '@/lib/data/source'
import ProductDetailView from '@/components/products/ProductDetailView'

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getProductDetail(id)
  if (!product) notFound()
  return <ProductDetailView product={product} />
}
