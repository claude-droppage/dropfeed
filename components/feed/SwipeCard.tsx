'use client'

import { useRef, useEffect } from 'react'
import Image from 'next/image'
import { Flame, Package, Cloud, Smartphone, Key, GraduationCap, Clock, Layers, Play, ImageIcon, Heart, ArrowUpRight, ExternalLink, Volume2, VolumeX } from 'lucide-react'
import type { FeedItem, OfferType, AdFormat } from '@/lib/types'
import { pl } from '@/lib/i18n/pl'

function OfferIcon({ type }: { type: OfferType }) {
  const map: Record<OfferType, React.ReactNode> = {
    physical:  <Package size={13} />,
    digital:   <Cloud size={13} />,
    app:       <Smartphone size={13} />,
    service:   <Key size={13} />,
    course:    <GraduationCap size={13} />,
    other:     <Package size={13} />,
  }
  return <>{map[type]}</>
}

function FormatIcon({ format }: { format: AdFormat }) {
  return format === 'video' ? <Play size={13} /> : <ImageIcon size={13} />
}

const isVideoSrc = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url)

interface Props {
  item: FeedItem
  isMuted: boolean
  onSave: () => void
  onSkip: () => void
  onToggleMute: () => void
  onDeepDive: () => void
}

export default function SwipeCard({ item, isMuted, onSave, onSkip, onToggleMute, onDeepDive }: Props) {
  const { ad, brand, product } = item
  const freshnessWidth = `${Math.min((ad.ageInDays / 90) * 100, 100).toFixed(0)}%`
  const showOfferName = product && product.confidence >= 0.7
  const isVideo = ad.format === 'video' && isVideoSrc(ad.creativeUrl)

  // Wymuszenie stanu wyciszenia na elemencie <video> (prop `muted` w React bywa
  // niespójny); tap = gest użytkownika, więc odmutowanie po tapnięciu jest dozwolone.
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted
  }, [isMuted])

  const pill = 'flex items-center gap-1 border border-line text-text-mid text-xs px-2 py-[5px] rounded-[999px] font-mono shrink-0'
  const pillBg = 'bg-[rgba(21,21,26,0.85)]'

  return (
    <div className="relative w-full h-full overflow-hidden bg-bg-raised select-none">
      {/* Creative (background) */}
      <div className="absolute inset-0" onClick={onToggleMute}>
        {isVideo ? (
          <video
            ref={videoRef}
            src={ad.creativeUrl}
            autoPlay
            muted={isMuted}
            playsInline
            loop
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <>
            {/* Rozmyte tło: ten sam obraz, powiększony + mocno rozmyty (Instagram) */}
            <Image
              src={ad.creativeUrl}
              alt=""
              fill
              sizes="100vw"
              aria-hidden
              className="object-cover scale-110 blur-2xl"
              draggable={false}
            />
            {/* Ostry obraz w pełnej, oryginalnej proporcji, wyśrodkowany (bez ucinania) */}
            <Image
              src={ad.creativeUrl}
              alt=""
              fill
              sizes="100vw"
              className="object-contain"
              draggable={false}
              priority
            />
          </>
        )}
        {/* Bottom scrim */}
        <div
          className="absolute inset-x-0 bottom-0 h-3/5 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(11,11,14,.82) 0%, transparent 100%)' }}
        />
      </div>

      {/* Wskaźnik dźwięku — tap na kreację toggluje; ikona pokazuje stan */}
      {isVideo && (
        <div className="absolute top-3 right-3 z-20 flex items-center justify-center w-8 h-8 rounded-full bg-[rgba(21,21,26,0.7)] border border-line text-text-hi pointer-events-none">
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </div>
      )}

      {/* Top data bar */}
      <div className="absolute top-12 inset-x-2.5 flex items-center gap-1.5 pointer-events-none">
        {/* Heat pill — amber */}
        <span className="flex items-center gap-1 bg-[rgba(65,36,2,0.93)] text-[#FAC775] text-xs font-medium px-2.5 py-[5px] rounded-[999px] font-mono shrink-0">
          <Flame size={11} />
          {Math.round(ad.heatScore)}
        </span>
        {/* Offer type */}
        <span className={`${pill} ${pillBg}`}>
          <OfferIcon type={ad.offerType} />
        </span>
        {/* Age */}
        <span className={`${pill} ${pillBg}`}>
          <Clock size={11} />
          {ad.ageInDays}d
        </span>
        {/* Variant count */}
        <span className={`${pill} ${pillBg}`}>
          <Layers size={11} />
          {ad.adVariantsCount}
        </span>
        {/* Format */}
        <span className={`${pill} ${pillBg} text-text-lo`}>
          <FormatIcon format={ad.format} />
        </span>
      </div>

      {/* Right action bar */}
      <div className="absolute right-2.5 bottom-28 flex flex-col gap-3 items-center pointer-events-auto">
        <ActionBtn
          icon={<Heart size={20} />}
          label={pl.feed.actions.save}
          variant="heat"
          onClick={(e) => { e.stopPropagation(); onSave() }}
        />
        <ActionBtn
          icon={<ArrowUpRight size={18} />}
          label={pl.feed.actions.deepDive}
          onClick={(e) => { e.stopPropagation(); onDeepDive() }}
        />
        {brand.storeUrl && (
          <ActionBtn
            icon={<ExternalLink size={18} />}
            label={pl.feed.actions.page}
            onClick={(e) => {
              e.stopPropagation()
              window.open(brand.storeUrl, '_blank', 'noopener')
            }}
          />
        )}
      </div>

      {/* Bottom-left brand info — tap opens deep dive */}
      <button
        className="absolute left-3 right-[72px] bottom-4 text-left"
        onClick={(e) => { e.stopPropagation(); onDeepDive() }}
      >
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          {/* Avatar */}
          <div className="w-7 h-7 rounded-full bg-[rgba(38,38,44,0.95)] flex items-center justify-center text-[10px] font-medium text-profit shrink-0">
            {brand.avatarInitials}
          </div>
          <span className="text-text-hi text-[13px] font-medium leading-none">
            {brand.name}
          </span>
          {ad.scalingSince !== undefined && (
            <span className="bg-[rgba(11,11,14,0.70)] border border-line text-profit text-[10px] font-mono px-2 py-0.5 rounded-[999px] shrink-0">
              {pl.feed.labels.scaling}
            </span>
          )}
        </div>
        {showOfferName && (
          <p className="text-text-hi text-[15px] font-medium leading-snug">
            {product.name}
          </p>
        )}
      </button>

      {/* Freshness bar */}
      <div className="absolute bottom-0 inset-x-0 h-1 bg-line pointer-events-none">
        <div
          className="h-full bg-heat"
          style={{ width: freshnessWidth, transition: 'width .7s ease-out' }}
        />
      </div>
    </div>
  )
}

function ActionBtn({
  icon,
  label,
  variant = 'default',
  onClick,
}: {
  icon: React.ReactNode
  label: string
  variant?: 'heat' | 'default'
  onClick?: (e: React.MouseEvent) => void
}) {
  return (
    <button
      className="flex flex-col items-center gap-0.5 cursor-pointer"
      onClick={onClick}
      aria-label={label}
    >
      <div
        className={`w-11 h-11 rounded-full flex items-center justify-center ${
          variant === 'heat'
            ? 'bg-[rgba(65,36,2,0.93)] border border-[#854F0B] text-[#FAC775]'
            : 'bg-[rgba(21,21,26,0.85)] border border-line text-text-hi'
        }`}
      >
        {icon}
      </div>
      <span className="text-text-mid text-[10px]">{label}</span>
    </button>
  )
}
