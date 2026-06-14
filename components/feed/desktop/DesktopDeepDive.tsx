'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import type { FeedItem } from '@/lib/types'
import { getBrandActiveAdCount, getBrandSnapshots } from '@/lib/data/source'
import BrandDeepDive from '@/components/deepdive/BrandDeepDive'

interface Props {
  item: FeedItem | null
  onSave?: () => void
}

export default function DesktopDeepDive({ item, onSave }: Props) {
  const brandId = item?.brand.id ?? null
  const [count, setCount] = useState(0)
  const [snapshots, setSnapshots] = useState<{ day: string; count: number }[]>([])

  useEffect(() => {
    if (!brandId) return
    let cancelled = false
    Promise.all([getBrandActiveAdCount(brandId), getBrandSnapshots(brandId)])
      .then(([c, s]) => { if (!cancelled) { setCount(c); setSnapshots(s) } })
      .catch(() => { if (!cancelled) { setCount(0); setSnapshots([]) } })
    return () => { cancelled = true }
  }, [brandId])

  if (!item) {
    return (
      <aside className="w-[280px] shrink-0 border-l border-line bg-bg-surface flex items-center justify-center p-6">
        <p className="text-text-lo text-[13px] text-center leading-relaxed">
          kliknij kartę żeby zobaczyć szczegóły
        </p>
      </aside>
    )
  }

  return (
    <aside className="w-[280px] shrink-0 border-l border-line bg-bg-surface flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <BrandDeepDive brand={item.brand} ad={item.ad} brandAdCount={count} snapshots={snapshots} />
      </div>

      <div className="p-4 border-t border-line shrink-0">
        <button
          onClick={onSave}
          className="w-full flex items-center justify-center gap-2 bg-heat text-[#2A1700] text-sm font-medium py-2.5 rounded-[999px] hover:brightness-110 transition-all"
        >
          <Heart size={14} />
          Zapisz do boardu
        </button>
      </div>
    </aside>
  )
}
