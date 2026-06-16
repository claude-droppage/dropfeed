'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import type { FeedItem, FeedMode } from '@/lib/types'
import type { AdLimit } from '@/lib/hooks/useAdLimit'
import { pl } from '@/lib/i18n/pl'
import DesktopTopBar from './DesktopTopBar'
import DesktopSidebar from './DesktopSidebar'
import DesktopGrid from './DesktopGrid'
import DesktopPlayer from './DesktopPlayer'
import DesktopDeepDive from './DesktopDeepDive'

interface Props {
  items: FeedItem[]
  onLoadMore?: () => void
  hasMore?: boolean
  adLimit: AdLimit
}

export default function DesktopFeedView({ items, onLoadMore, hasMore, adLimit }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<FeedMode>('products')
  const [view, setView] = useState<'grid' | 'player'>('grid')
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  // Feed jest nieskończony i już posortowany po heat (server-side) — bez slice'a.
  const filtered = items

  // Desktop = teaser jak konkurencja: free widzi pierwsze `limit` kart (5 rzędów × 4),
  // reszta rozmyta + pływający CTA. Pro = bez blura. (Mobile ma osobny model: licznik
  // dzienny per swipe.) Blur jest pozycyjny, więc desktop nie zużywa dziennego limitu.
  const blurFrom = adLimit.unlimited ? Infinity : (adLimit.limit ?? 20)
  const isBlurred = (idx: number) => idx >= blurFrom
  const hasBlurred = !adLimit.unlimited && filtered.length > blurFrom

  const handleSelect = (idx: number) => {
    if (isBlurred(idx)) { router.push('/pro'); return }
    setSelectedIdx(idx)
    setView('player')
  }

  const handlePlayerNavigate = (idx: number) => {
    if (isBlurred(idx)) { router.push('/pro'); return }
    setSelectedIdx(idx)
    // stay in player view
  }

  const handleClose = () => {
    setView('grid')
    // keep selectedIdx so the selected card stays highlighted in grid
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
        <main className="relative flex-1 min-w-0 min-h-0 overflow-hidden">
          {view === 'grid' ? (
            <DesktopGrid
              items={filtered}
              selectedIdx={selectedIdx}
              onSelect={handleSelect}
              onLoadMore={onLoadMore}
              hasMore={hasMore}
              isBlurred={isBlurred}
              blockLoadMore={hasBlurred}
            />
          ) : (
            <DesktopPlayer
              items={filtered}
              selectedIdx={selectedIdx ?? 0}
              onSelect={handlePlayerNavigate}
              onClose={handleClose}
              playableCount={blurFrom === Infinity ? undefined : blurFrom}
            />
          )}

          {/* Pływający CTA odblokowania (gdy są rozmyte karty, widok gridu) */}
          {view === 'grid' && hasBlurred && (
            <div className="absolute bottom-6 inset-x-0 flex justify-center pointer-events-none">
              <button
                type="button"
                onClick={() => router.push('/pro')}
                className="pointer-events-auto flex items-center gap-2 bg-heat text-[#2A1700] text-sm font-semibold pl-5 pr-4 py-3 rounded-[999px] shadow-[0_8px_28px_rgba(0,0,0,0.45)] hover:brightness-110 transition-all"
              >
                <Sparkles size={16} />
                {pl.profile.upgrade}
                <span aria-hidden>🔓</span>
              </button>
            </div>
          )}
        </main>

        {/* Right deep-dive panel */}
        <DesktopDeepDive
          item={selectedItem}
          onSave={() => { /* TODO: save to board */ }}
        />
      </div>
    </div>
  )
}
