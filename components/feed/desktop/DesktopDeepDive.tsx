'use client'

import { Heart } from 'lucide-react'
import type { FeedItem, Ad } from '@/lib/types'
import { getAdsByBrand } from '@/lib/data/source'
import BrandDeepDive from '@/components/deepdive/BrandDeepDive'

interface Props {
  item: FeedItem | null
  onSave?: () => void
  onSelectAd?: (ad: Ad) => void
}

export default function DesktopDeepDive({ item, onSave, onSelectAd }: Props) {
  if (!item) {
    return (
      <aside className="w-[280px] shrink-0 border-l border-line bg-bg-surface flex items-center justify-center p-6">
        <p className="text-text-lo text-[13px] text-center leading-relaxed">
          kliknij kartę żeby zobaczyć szczegóły
        </p>
      </aside>
    )
  }

  const { brand } = item
  const brandAds = getAdsByBrand(brand.id)

  return (
    <aside className="w-[280px] shrink-0 border-l border-line bg-bg-surface flex flex-col overflow-hidden">
      {/* Scrollable deep-dive content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <BrandDeepDive brand={brand} brandAds={brandAds} onSelectAd={onSelectAd} />
      </div>

      {/* Save CTA */}
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
