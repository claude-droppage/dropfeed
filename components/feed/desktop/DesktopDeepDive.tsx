'use client'

import { Heart, ExternalLink } from 'lucide-react'
import type { FeedItem } from '@/lib/types'
import { pl } from '@/lib/i18n/pl'

interface Props {
  item: FeedItem | null
  onSave?: () => void
}

export default function DesktopDeepDive({ item, onSave }: Props) {
  /* ── Empty state ─────────────────────────────────────────────────────── */
  if (!item) {
    return (
      <aside className="w-[280px] shrink-0 border-l border-line bg-bg-surface flex items-center justify-center p-6">
        <p className="text-text-lo text-[13px] text-center leading-relaxed">
          kliknij kartę żeby zobaczyć szczegóły
        </p>
      </aside>
    )
  }

  const { ad, brand, product } = item
  const showOfferName = product && product.confidence >= 0.7

  const stats: { label: string; value: string | number; color?: string }[] = [
    { label: 'Heat score',      value: Math.round(ad.heatScore),  color: 'text-heat' },
    { label: 'Aktywna od',      value: `${ad.ageInDays} d` },
    ...(ad.scalingSince !== undefined
      ? [{ label: 'Skaluje od', value: `${ad.scalingSince} d`,    color: 'text-profit' }]
      : []),
    { label: 'Warianty reklam', value: ad.adVariantsCount },
    { label: 'Kategoria',       value: pl.offerType[ad.offerType] },
    { label: 'Kraje',           value: ad.countries.length },
  ]

  return (
    <aside className="w-[280px] shrink-0 border-l border-line bg-bg-surface flex flex-col overflow-hidden">
      {/* Brand header */}
      <div className="p-5 border-b border-line shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-bg-raised flex items-center justify-center text-[11px] font-medium text-profit shrink-0">
            {brand.avatarInitials}
          </div>
          <div className="min-w-0">
            <p className="text-text-hi text-sm font-medium leading-none mb-1 truncate">
              {brand.name}
            </p>
            {brand.igHandle && (
              <p className="text-text-lo text-xs truncate">@{brand.igHandle}</p>
            )}
          </div>
        </div>

        {showOfferName && (
          <p className="text-text-hi text-[13px] font-medium leading-snug">
            {product.name}
          </p>
        )}

        {ad.scalingSince !== undefined && (
          <span className="inline-flex mt-2 text-profit border border-profit/30 bg-bg-raised text-[10px] font-mono px-2 py-0.5 rounded-[999px]">
            {pl.feed.labels.scaling}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="flex-1 overflow-y-auto px-5 py-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex items-center justify-between py-2 border-b border-line last:border-0"
          >
            <span className="text-text-mid text-xs">{s.label}</span>
            <span className={`font-mono text-xs font-medium ${s.color ?? 'text-text-hi'}`}>
              {s.value}
            </span>
          </div>
        ))}

        {brand.storeUrl && (
          <a
            href={brand.storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 mt-4 text-text-lo text-xs hover:text-text-mid transition-colors"
          >
            <ExternalLink size={12} />
            {pl.feed.actions.page}
          </a>
        )}
      </div>

      {/* Save CTA */}
      <div className="p-4 border-t border-line shrink-0">
        <button
          onClick={onSave}
          className="w-full flex items-center justify-center gap-2 bg-heat text-[#2A1700] text-sm font-medium py-2.5 rounded-[999px] hover:brightness-110 transition-all"
        >
          <Heart size={14} />
          Zapisz do boardu
        </button>
      </div>
    </aside>
  )
}
