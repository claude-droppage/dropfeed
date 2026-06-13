'use client'

import { useState, useMemo } from 'react'
import type { FeedItem, FeedMode, OfferType } from '@/lib/types'
import ModeToggle from './ModeToggle'
import SwipeDeck from './SwipeDeck'
import DesktopFeedView from './desktop/DesktopFeedView'

interface Props {
  items: FeedItem[]
  initialMode?: FeedMode
  initialOfferTypes?: OfferType[] | null
}

export default function FeedView({ items, initialMode = 'products', initialOfferTypes }: Props) {
  const [mode, setMode] = useState<FeedMode>(initialMode)
  // offerTypes: null = no filter; [] treated same as null (show all)
  const [offerTypes] = useState<OfferType[] | null>(initialOfferTypes ?? null)

  const filtered = useMemo(() => {
    let result = items

    // offerType filter (from intent selection in onboarding)
    if (offerTypes && offerTypes.length > 0) {
      result = result.filter((item) => offerTypes.includes(item.ad.offerType))
    }

    // mode filter
    if (mode === 'hot') {
      result = [...result].sort((a, b) => b.ad.heatScore - a.ad.heatScore).slice(0, 10)
    }

    return result
  }, [items, mode, offerTypes])

  return (
    <div className="h-full">
      {/* ── Mobile (<768px) ──────────────────────────────────────────── */}
      <div className="md:hidden relative h-full">
        <SwipeDeck items={filtered} mode={mode} />
        <div className="absolute top-0 inset-x-0 z-20 flex justify-center pointer-events-none">
          <div className="pt-3.5 pointer-events-auto">
            <ModeToggle value={mode} onChange={setMode} />
          </div>
        </div>
      </div>

      {/* ── Desktop (≥768px) ─────────────────────────────────────────── */}
      <div className="hidden md:block h-full">
        <DesktopFeedView items={filtered} />
      </div>
    </div>
  )
}
