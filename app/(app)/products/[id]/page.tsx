import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { notFound } from 'next/navigation'
import { getProductDetail } from '@/lib/data/source'

// Stub D3 — pełny deep-dive (statystyki + „Reklamy tego produktu" + link do
// biblioteki) wchodzi w D4. Tu minimalnie, żeby klik z listy nie dawał 404.
export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const p = await getProductDetail(id)
  if (!p) notFound()

  return (
    <div className="h-full overflow-y-auto bg-bg-void">
      <div className="mx-auto max-w-lg px-5 py-5">
        <Link href="/products" className="inline-flex items-center gap-1.5 text-text-lo text-sm mb-5 hover:text-text-mid transition-colors">
          <ArrowLeft size={15} /> Produkty
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-b from-bg-raised to-bg-void flex items-center justify-center text-4xl shrink-0">{p.emoji}</div>
          <div>
            <h1 className="text-text-hi text-xl font-bold tracking-tight">{p.name}</h1>
            <p className="text-text-mid text-sm mt-0.5">{p.shop} · {p.price}</p>
          </div>
        </div>
        <p className="mt-6 text-text-lo text-sm">Pełny deep-dive (statystyki + reklamy tego produktu) — wkrótce.</p>
      </div>
    </div>
  )
}
