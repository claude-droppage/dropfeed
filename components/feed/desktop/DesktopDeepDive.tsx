'use client'

import { useEffect, useState } from 'react'
import { Heart, X } from 'lucide-react'
import type { FeedItem } from '@/lib/types'
import { getBrandActiveAdCount, getBrandSnapshots } from '@/lib/data/source'
import BrandDeepDive from '@/components/deepdive/BrandDeepDive'

interface Props {
  item: FeedItem | null
  onSave?: () => void
  onClose?: () => void
}

export default function DesktopDeepDive({ item, onSave, onClose }: Props) {
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

  // Brak zaznaczenia → panel nie istnieje (pełna siatka kart, bez pustego panelu).
  if (!item) return null

  return (
    <aside className="w-[300px] shrink-0 border-l border-line bg-bg-surface flex flex-col overflow-hidden">
      {onClose && (
        <div className="flex justify-end px-2 pt-2 shrink-0">
          <button type="button" onClick={onClose} aria-label="Zamknij" className="p-1.5 rounded-lg text-text-lo hover:text-text-hi hover:bg-bg-raised transition-colors">
            <X size={16} />
          </button>
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-4 pb-4 pt-1">
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
