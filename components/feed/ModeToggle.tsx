'use client'

import type { FeedMode } from '@/lib/types'
import { pl } from '@/lib/i18n/pl'

const modes: { key: FeedMode; label: string }[] = [
  { key: 'inspirations', label: pl.feed.modes.inspirations },
  { key: 'products',     label: pl.feed.modes.products },
  { key: 'hot',          label: pl.feed.modes.hot },
]

interface Props {
  value: FeedMode
  onChange: (mode: FeedMode) => void
}

export default function ModeToggle({ value, onChange }: Props) {
  return (
    <div className="flex justify-center gap-5 pointer-events-auto">
      {modes.map(({ key, label }) => {
        const active = value === key
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`text-[13px] font-medium pb-0.5 transition-colors ${
              active
                ? 'text-text-hi border-b-2 border-heat'
                : 'text-text-lo border-b-2 border-transparent'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
