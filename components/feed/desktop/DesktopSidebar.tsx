'use client'

import type { FeedItem, FeedMode } from '@/lib/types'
import { pl } from '@/lib/i18n/pl'

const MODES: { key: FeedMode; label: string }[] = [
  { key: 'products',     label: pl.feed.modes.products },
  { key: 'inspirations', label: pl.feed.modes.inspirations },
  { key: 'hot',          label: pl.feed.modes.hot },
]

interface Props {
  mode: FeedMode
  onModeChange: (m: FeedMode) => void
  view: 'grid' | 'player'
  items: FeedItem[]
  selectedIdx: number | null
  onSelect: (idx: number) => void
}

export default function DesktopSidebar({
  mode,
  onModeChange,
  view,
  items,
  selectedIdx,
  onSelect,
}: Props) {
  /* ── Player mode: thumbnail filmstrip ─────────────────────────────────── */
  if (view === 'player') {
    return (
      <aside className="w-[68px] shrink-0 border-r border-line bg-bg-surface overflow-y-auto">
        <div className="p-2 flex flex-col gap-1.5">
          {items.map((item, idx) => (
            <button
              key={item.ad.id}
              onClick={() => onSelect(idx)}
              className={`relative aspect-[9/14] w-full rounded-[8px] overflow-hidden border transition-colors ${
                selectedIdx === idx
                  ? 'border-heat'
                  : 'border-line hover:border-text-lo'
              }`}
            >
              <img
                src={item.ad.creativeUrl}
                alt=""
                className="w-full h-full object-cover"
                draggable={false}
              />
              <span className="absolute bottom-0.5 inset-x-0.5 text-center bg-heat-deep/95 text-[#FAC775] font-mono text-[8px] rounded-[3px] py-0.5">
                {Math.round(item.ad.heatScore)}
              </span>
            </button>
          ))}
        </div>
      </aside>
    )
  }

  /* ── Grid mode: mode selector ─────────────────────────────────────────── */
  return (
    <aside className="w-[148px] shrink-0 border-r border-line bg-bg-surface px-3 py-5">
      <p className="text-text-lo text-[10px] uppercase tracking-widest font-medium px-2 mb-3">
        Tryb
      </p>
      <div className="flex flex-col gap-0.5">
        {MODES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onModeChange(key)}
            className={`text-left w-full px-3 py-2 rounded-[8px] text-sm transition-colors ${
              mode === key
                ? 'bg-bg-raised text-text-hi font-medium'
                : 'text-text-lo hover:text-text-mid hover:bg-bg-raised/50'
            }`}
          >
            {mode === key && (
              <span className="text-heat mr-1.5">·</span>
            )}
            {label}
          </button>
        ))}
      </div>
    </aside>
  )
}
