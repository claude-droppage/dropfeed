'use client'

import { useState } from 'react'
import type { FeedMode, OfferType, Niche } from '@/lib/types'
import { useInfiniteFeed } from '@/lib/hooks/useInfiniteFeed'
import ModeToggle from './ModeToggle'
import SwipeDeck from './SwipeDeck'
import DesktopFeedView from './desktop/DesktopFeedView'

interface Props {
  initialMode?: FeedMode
  initialOfferTypes?: OfferType[] | null
  initialNiches?: Niche[]
}

export default function FeedView({ initialMode = 'products', initialOfferTypes, initialNiches }: Props) {
  const [mode, setMode] = useState<FeedMode>(initialMode)
  const offerTypes = initialOfferTypes && initialOfferTypes.length ? initialOfferTypes : null
  const preferredNiches = initialNiches && initialNiches.length ? initialNiches : null
  // seed sesji — raz na montaż; stały przez całe scrollowanie (brak duplikatów)
  const [seed] = useState(() => Math.floor(Math.random() * 2_000_000_000))

  const { items, loadMore, hasMore } = useInfiniteFeed({ offerTypes, seed, preferredNiches })

  return (
    <div className="h-full">
      {/* ── Mobile (<768px) ──────────────────────────────────────────── */}
      <div className="md:hidden relative h-full">
        <SwipeDeck items={items} mode={mode} onNearEnd={loadMore} hasMore={hasMore} />
        <div className="absolute top-0 inset-x-0 z-20 flex justify-center pointer-events-none">
          <div className="pt-3.5 pointer-events-auto">
            <ModeToggle value={mode} onChange={setMode} />
          </div>
        </div>
      </div>

      {/* ── Desktop (≥768px) ─────────────────────────────────────────── */}
      <div className="hidden md:block h-full">
        <DesktopFeedView items={items} onLoadMore={loadMore} hasMore={hasMore} />
      </div>
    </div>
  )
}
