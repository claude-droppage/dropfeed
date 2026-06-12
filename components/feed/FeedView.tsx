'use client'

import { useState } from 'react'
import type { FeedItem, FeedMode } from '@/lib/types'
import ModeToggle from './ModeToggle'
import SwipeDeck from './SwipeDeck'
import DesktopFeedView from './desktop/DesktopFeedView'

interface Props {
  items: FeedItem[]
}

export default function FeedView({ items }: Props) {
  const [mode, setMode] = useState<FeedMode>('products')

  const filtered =
    mode === 'hot'
      ? [...items].sort((a, b) => b.ad.heatScore - a.ad.heatScore).slice(0, 10)
      : items

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
        <DesktopFeedView items={items} />
      </div>
    </div>
  )
}
