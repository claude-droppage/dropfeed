'use client'

import type { FeedSource } from '@/lib/types'

// Wspólny przełącznik źródła FB/TikTok (feed + produkty). TikTok = wizualny
// (mock/„wkrótce") do czasu Fazy 2. full = pełna szerokość (mobile).
export default function SourceToggle({
  value,
  onChange,
  full = false,
}: {
  value: FeedSource
  onChange: (v: FeedSource) => void
  full?: boolean
}) {
  return (
    <div className={`flex bg-bg-surface border border-line rounded-[10px] p-[3px] gap-0.5 ${full ? 'w-full' : ''}`}>
      {(['facebook', 'tiktok'] as const).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`text-[13px] font-semibold py-2 rounded-[7px] transition-colors ${full ? 'flex-1' : 'px-4'} ${
            value === s ? 'bg-heat text-[#0a0b0d]' : 'text-text-mid hover:text-text-hi'
          }`}
        >
          {s === 'facebook' ? 'Facebook' : 'TikTok'}
        </button>
      ))}
    </div>
  )
}
