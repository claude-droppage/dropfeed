'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Lock } from 'lucide-react'
import type { FeedItem } from '@/lib/types'
import { pl } from '@/lib/i18n/pl'

const isVideoSrc = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url)

/* ── Single grid card ─────────────────────────────────────────────────── */
function GridCard({
  item,
  active,
  blurred,
  onClick,
}: {
  item: FeedItem
  active: boolean
  blurred: boolean
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
      // content-visibility:auto — przeglądarka pomija render kart poza ekranem
      // (wirtualizacja bez zależności); contain-intrinsic-size rezerwuje miejsce,
      // żeby pasek przewijania i pozycja scrolla były stabilne.
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 320px' } as React.CSSProperties}
      className={`bg-bg-surface border rounded-[14px] overflow-hidden cursor-pointer transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-heat/50 ${
        active
          ? 'border-heat/60 ring-1 ring-heat/25'
          : 'border-line hover:border-line/60'
      }`}
    >
      {/* Media */}
      <div className="aspect-[9/12] bg-bg-raised relative overflow-hidden">
        {hovering && !blurred && ad.format === 'video' && isVideoSrc(ad.creativeUrl) ? (
          <video
            src={ad.creativeUrl}
            autoPlay
            muted
            playsInline
            loop
            className="w-full h-full object-cover"
          />
        ) : (
          <Image
            src={ad.thumbUrl ?? ad.creativeUrl}
            alt=""
            fill
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 25vw, 50vw"
            className={`object-cover transition-transform duration-200 ${
              blurred ? 'blur-md scale-110' : hovering ? 'scale-[1.04]' : 'scale-100'
            }`}
            draggable={false}
          />
        )}

        {/* Blokada — po wyczerpaniu limitu (klik → /pro) */}
        {blurred && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-void/45">
            <div className="w-9 h-9 rounded-full bg-bg-surface/85 border border-line flex items-center justify-center">
              <Lock size={15} className="text-heat" />
            </div>
          </div>
        )}

        {/* Heat badge */}
        {!blurred && (
          <span className="absolute top-2 left-2 bg-heat-deep text-[#FAC775] font-mono text-[10px] font-medium px-1.5 py-0.5 rounded-[999px]">
            {Math.round(ad.heatScore)}
          </span>
        )}

        {/* Video hover indicator (when not a real video URL) */}
        {hovering && !blurred && ad.format === 'video' && !isVideoSrc(ad.creativeUrl) && (
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
      <div className={`px-2.5 py-2 ${blurred ? 'blur-sm select-none' : ''}`}>
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
  onLoadMore?: () => void
  hasMore?: boolean
  isBlurred?: (idx: number) => boolean
  /** free + osiągnięto rozmyte karty → przestań doładowywać (nie ma sensu ładować blura w nieskończoność) */
  blockLoadMore?: boolean
}

export default function DesktopGrid({ items, selectedIdx, onSelect, onLoadMore, hasMore, isBlurred, blockLoadMore }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Infinite scroll: doładuj gdy sentinel zbliża się do dołu kontenera.
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !onLoadMore || blockLoadMore) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) onLoadMore()
      },
      { root: scrollRef.current, rootMargin: '600px' },
    )
    io.observe(sentinel)
    return () => io.disconnect()
  }, [onLoadMore, hasMore, blockLoadMore])

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      <div className="grid grid-cols-4 gap-3.5 p-5">
        {items.map((item, idx) => (
          <GridCard
            key={item.ad.id}
            item={item}
            active={selectedIdx === idx}
            blurred={isBlurred?.(idx) ?? false}
            onClick={() => onSelect(idx)}
          />
        ))}
      </div>
      {/* sentinel doładowywania (rootMargin 600px = ładuje zanim user dojedzie) */}
      <div ref={sentinelRef} className="h-px w-full" />
    </div>
  )
}
