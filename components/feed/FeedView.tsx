'use client'

import { useState } from 'react'
import type { FeedItem, FeedMode } from '@/lib/types'
import ModeToggle from './ModeToggle'
import SwipeDeck from './SwipeDeck'

interface Props {
  items: FeedItem[]
}

export default function FeedView({ items }: Props) {
  const [mode, setMode] = useState<FeedMode>('products')

  // Mode filtering: 'hot' = top 10 by heat; others = all items (mock has no inspirations metadata yet)
  const filtered =
    mode === 'hot'
      ? [...items].sort((a, b) => b.ad.heatScore - a.ad.heatScore).slice(0, 10)
      : items

  return (
    <div className="relative h-full">
      {/* SwipeDeck fills the area */}
      <SwipeDeck items={filtered} mode={mode} />

      {/* Mode toggle overlay — above the deck, pointer-events-none container */}
      <div className="absolute top-0 inset-x-0 z-20 flex justify-center pointer-events-none">
        <div className="pt-3.5 pointer-events-auto">
          <ModeToggle value={mode} onChange={setMode} />
        </div>
      </div>
    </div>
  )
}
