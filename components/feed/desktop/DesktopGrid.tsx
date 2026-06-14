'use client'

import { useState } from 'react'
import type { FeedItem } from '@/lib/types'
import { pl } from '@/lib/i18n/pl'

const isVideoSrc = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url)

/* ── Single grid card ─────────────────────────────────────────────────── */
function GridCard({
  item,
  active,
  onClick,
}: {
  item: FeedItem
  active: boolean
  onClick: () => void
}) {
  const { ad, brand, product } = item
  const [hovering, setHovering] = useState(false)
  const showOfferName = product && product.confidence >= 0.7
  const label = showOfferName ? product.name : brand.name

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={`bg-bg-surface border rounded-[14px] overflow-hidden cursor-pointer transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-heat/50 ${
        active
          ? 'border-heat/60 ring-1 ring-heat/25'
          : 'border-line hover:border-line/60'
      }`}
    >
      {/* Media */}
      <div className="aspect-[9/12] bg-bg-raised relative overflow-hidden">
        {hovering && ad.format === 'video' && isVideoSrc(ad.creativeUrl) ? (
          <video
            src={ad.creativeUrl}
            autoPlay
            muted
            playsInline
            loop
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={ad.thumbUrl ?? ad.creativeUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className={`w-full h-full object-cover transition-transform duration-200 ${
              hovering ? 'scale-[1.04]' : 'scale-100'
            }`}
            draggable={false}
          />
        )}

        {/* Heat badge */}
        <span className="absolute top-2 left-2 bg-heat-deep text-[#FAC775] font-mono text-[10px] font-medium px-1.5 py-0.5 rounded-[999px]">
          {Math.round(ad.heatScore)}
        </span>

        {/* Video hover indicator (when not a real video URL) */}
        {hovering && ad.format === 'video' && !isVideoSrc(ad.creativeUrl) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-9 h-9 rounded-full bg-bg-surface/80 border border-line flex items-center justify-center">
              <span className="text-text-hi text-sm">▶</span>
            </div>
          </div>
        )}

        {/* Freshness bar */}
        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-line">
          <div
            className="h-full bg-heat"
            style={{
              width: `${Math.min((ad.ageInDays / 90) * 100, 100).toFixed(0)}%`,
            }}
          />
        </div>
      </div>

      {/* Text */}
      <div className="px-2.5 py-2">
        <p className="text-text-hi text-[12px] font-medium leading-snug truncate">
          {label}
        </p>
        <span className="text-profit font-mono text-[11px]">
          {pl.offerType[ad.offerType]}&nbsp;·&nbsp;{ad.ageInDays}d
        </span>
      </div>
    </div>
  )
}

/* ── Grid container ───────────────────────────────────────────────────── */
interface Props {
  items: FeedItem[]
  selectedIdx: number | null
  onSelect: (idx: number) => void
}

export default function DesktopGrid({ items, selectedIdx, onSelect }: Props) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="grid grid-cols-4 gap-3.5 p-5">
        {items.map((item, idx) => (
          <GridCard
            key={item.ad.id}
            item={item}
            active={selectedIdx === idx}
            onClick={() => onSelect(idx)}
          />
        ))}
      </div>
    </div>
  )
}
