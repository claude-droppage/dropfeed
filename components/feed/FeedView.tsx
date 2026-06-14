'use client'

import { useState } from 'react'
import type { FeedItem, FeedMode, OfferType } from '@/lib/types'
import { useInfiniteFeed } from '@/lib/hooks/useInfiniteFeed'
import ModeToggle from './ModeToggle'
import SwipeDeck from './SwipeDeck'
import DesktopFeedView from './desktop/DesktopFeedView'

interface Props {
  /** Strona 1 z serwera (pobrana bez filtra offerType) */
  serverItems: FeedItem[]
  initialMode?: FeedMode
  initialOfferTypes?: OfferType[] | null
}

export default function FeedView({ serverItems, initialMode = 'products', initialOfferTypes }: Props) {
  const [mode, setMode] = useState<FeedMode>(initialMode)
  const offerTypes = initialOfferTypes && initialOfferTypes.length ? initialOfferTypes : null

  // Gdy aktywny filtr offerType, strona 1 z serwera (bez filtra) jest nieprzydatna
  // → startujemy z pustej listy, hook dociąga przefiltrowaną stronę 1. Bez filtra
  // używamy strony serwerowej (brak podwójnego fetcha).
  const [initialItems] = useState<FeedItem[]>(offerTypes ? [] : serverItems)
  const { items, loadMore, hasMore } = useInfiniteFeed({ initialItems, offerTypes })

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
