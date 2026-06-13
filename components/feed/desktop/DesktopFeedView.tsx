'use client'

import { useState } from 'react'
import type { FeedItem, FeedMode } from '@/lib/types'
import type { Ad } from '@/lib/types'
import DesktopTopBar from './DesktopTopBar'
import DesktopSidebar from './DesktopSidebar'
import DesktopGrid from './DesktopGrid'
import DesktopPlayer from './DesktopPlayer'
import DesktopDeepDive from './DesktopDeepDive'

interface Props {
  items: FeedItem[]
}

export default function DesktopFeedView({ items }: Props) {
  const [mode, setMode] = useState<FeedMode>('products')
  const [view, setView] = useState<'grid' | 'player'>('grid')
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  const filtered =
    mode === 'hot'
      ? [...items].sort((a, b) => b.ad.heatScore - a.ad.heatScore).slice(0, 10)
      : items

  const handleSelect = (idx: number) => {
    setSelectedIdx(idx)
    setView('player')
  }

  const handlePlayerNavigate = (idx: number) => {
    setSelectedIdx(idx)
    // stay in player view
  }

  const handleClose = () => {
    setView('grid')
    // keep selectedIdx so the selected card stays highlighted in grid
  }

  const handleSelectAdFromDeepDive = (ad: Ad) => {
    const idx = filtered.findIndex((item) => item.ad.id === ad.id)
    if (idx >= 0) {
      setSelectedIdx(idx)
      setView('player')
    }
  }

  const handleModeChange = (m: FeedMode) => {
    setMode(m)
    setView('grid')
    setSelectedIdx(null)
  }

  const selectedItem = selectedIdx !== null ? (filtered[selectedIdx] ?? null) : null

  return (
    <div className="flex flex-col h-full bg-bg-void">
      <DesktopTopBar />

      <div className="flex flex-1 min-h-0">
        {/* Left sidebar */}
        <DesktopSidebar
          mode={mode}
          onModeChange={handleModeChange}
          view={view}
          items={filtered}
          selectedIdx={selectedIdx}
          onSelect={handlePlayerNavigate}
        />

        {/* Main content */}
        <main className="flex-1 min-w-0 min-h-0 overflow-hidden">
          {view === 'grid' ? (
            <DesktopGrid
              items={filtered}
              selectedIdx={selectedIdx}
              onSelect={handleSelect}
            />
          ) : (
            <DesktopPlayer
              items={filtered}
              selectedIdx={selectedIdx ?? 0}
              onSelect={handlePlayerNavigate}
              onClose={handleClose}
            />
          )}
        </main>

        {/* Right deep-dive panel */}
        <DesktopDeepDive
          item={selectedItem}
          onSave={() => { /* TODO: save to board */ }}
          onSelectAd={handleSelectAdFromDeepDive}
        />
      </div>
    </div>
  )
}
