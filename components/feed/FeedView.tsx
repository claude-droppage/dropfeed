'use client'

import { useState } from 'react'
import type { FeedMode, OfferType, Niche, FeedSource } from '@/lib/types'
import { useInfiniteFeed } from '@/lib/hooks/useInfiniteFeed'
import { useAdLimit } from '@/lib/hooks/useAdLimit'
import SourceToggle from '@/components/shell/SourceToggle'
import SwipeDeck from './SwipeDeck'
import TikTokSoon from './TikTokSoon'
import DesktopFeedView from './desktop/DesktopFeedView'

interface Props {
  initialMode?: FeedMode
  initialOfferTypes?: OfferType[] | null
  initialNiches?: Niche[]
  /** Pro = świeży seed co refresh; Free = stały seed dzienny (daySeed) */
  isPro?: boolean
  daySeed?: number
}

export default function FeedView({ initialMode = 'products', initialOfferTypes, initialNiches, isPro = false, daySeed = 0 }: Props) {
  const offerTypes = initialOfferTypes && initialOfferTypes.length ? initialOfferTypes : null
  const preferredNiches = initialNiches && initialNiches.length ? initialNiches : null
  // Pro: seed losowany przy montażu (świeże co refresh). Free: stały seed dzienny
  // (ten sam zestaw cały dzień, nowy jutro). Default free.
  const [seed] = useState(() => (isPro ? Math.floor(Math.random() * 2_000_000_000) : daySeed))
  // źródło reklam — TikTok wizualnie (mock/„wkrótce"), feed leci z Facebooka
  const [source, setSource] = useState<FeedSource>('facebook')

  const { items, loadMore, hasMore } = useInfiniteFeed({ offerTypes, seed, preferredNiches })
  const adLimit = useAdLimit()
  const showCounter = !adLimit.unlimited && adLimit.remaining !== null

  return (
    <div className="h-full">
      {/* ── Mobile (<768px) ──────────────────────────────────────────── */}
      <div className="md:hidden relative h-full">
        {source === 'facebook' ? (
          <SwipeDeck items={items} mode={initialMode} onNearEnd={loadMore} hasMore={hasMore} adLimit={adLimit} />
        ) : (
          <TikTokSoon />
        )}
        <div className="absolute top-0 inset-x-0 z-20 flex justify-center pointer-events-none">
          <div className="pt-3.5 pointer-events-auto">
            <SourceToggle value={source} onChange={setSource} />
          </div>
          {showCounter && source === 'facebook' && (
            <div className="absolute right-3 top-3.5 bg-bg-surface/80 backdrop-blur border border-line rounded-[999px] px-2.5 py-1">
              <span className="font-mono text-[11px] text-text-mid">
                {adLimit.remaining}/{adLimit.limit ?? 20}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Desktop (≥768px) ─────────────────────────────────────────── */}
      <div className="hidden md:block h-full">
        <DesktopFeedView
          items={items}
          onLoadMore={loadMore}
          hasMore={hasMore}
          adLimit={adLimit}
          source={source}
          onSourceChange={setSource}
        />
      </div>
    </div>
  )
}
