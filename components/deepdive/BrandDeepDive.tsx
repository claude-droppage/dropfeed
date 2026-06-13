'use client'

import Image from 'next/image'
import { ExternalLink } from 'lucide-react'
import type { Brand, Ad } from '@/lib/types'

function formatFollowers(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.', ',')}k`
  return String(n)
}

function generateScalingBars(brandAds: Ad[]): { pct: number; hot: boolean }[] {
  const maxHeat = Math.max(...brandAds.map((a) => a.heatScore), 0)
  const scalingSince = brandAds.find((a) => a.scalingSince !== undefined)?.scalingSince
  const scalingWeeks =
    scalingSince !== undefined ? Math.max(1, Math.ceil(scalingSince / 7)) : 0
  const s = Math.min(1, maxHeat / 100)

  // Ramp pattern that peaks at current heat level — deterministic, no randomness
  const raw = [
    0.18,
    0.28,
    0.22,
    Math.max(0.2, 0.4 * s + 0.1),
    Math.max(0.28, 0.55 * s + 0.15),
    Math.max(0.4, 0.8 * s + 0.1),
    Math.max(0.5, s),
  ]
  return raw.map((pct, i) => ({
    pct: Math.min(1, pct),
    hot: scalingWeeks > 0 && i >= 7 - scalingWeeks,
  }))
}

interface Props {
  brand: Brand
  brandAds: Ad[]
  onSelectAd?: (ad: Ad) => void
}

export default function BrandDeepDive({ brand, brandAds, onSelectAd }: Props) {
  const sorted = [...brandAds].sort((a, b) => b.heatScore - a.heatScore)
  const bars = generateScalingBars(brandAds)
  const hasScaling = brandAds.some((a) => a.scalingSince !== undefined)

  return (
    <div className="flex flex-col gap-4">
      {/* Brand header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-bg-raised border border-line flex items-center justify-center text-[13px] font-medium text-profit shrink-0">
          {brand.avatarInitials}
        </div>
        <div className="min-w-0">
          <p className="text-text-hi font-medium text-[15px] leading-tight truncate">
            {brand.name}
          </p>
          <p className="text-text-lo text-xs mt-0.5">
            {brand.igFollowers
              ? `IG ${formatFollowers(brand.igFollowers)} obserwujących · `
              : ''}
            {brandAds.length} aktywnych reklam
          </p>
        </div>
      </div>

      {/* Link chips */}
      <div className="flex gap-2 flex-wrap">
        {brand.storeUrl && (
          <a
            href={brand.storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-text-mid bg-bg-raised border border-line rounded-full px-3 py-1.5 hover:border-line/60 transition-colors"
          >
            sklep <ExternalLink size={11} />
          </a>
        )}
        {brand.igHandle && (
          <a
            href={`https://instagram.com/${brand.igHandle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-text-mid bg-bg-raised border border-line rounded-full px-3 py-1.5 hover:border-line/60 transition-colors"
          >
            instagram <ExternalLink size={11} />
          </a>
        )}
      </div>

      {/* Scaling chart */}
      <div className="bg-bg-surface border border-line rounded-2xl p-4">
        <p className="text-xs font-medium text-text-mid mb-3">
          Oś skalowania — nowe warianty / tydzień
        </p>
        <div className="flex items-end gap-[5px] h-14">
          {bars.map((bar, i) => (
            <div
              key={i}
              className={`flex-1 rounded-t-[3px] ${bar.hot ? 'bg-heat' : 'bg-line'}`}
              style={{ height: `${Math.round(bar.pct * 100)}%` }}
            />
          ))}
        </div>
        <p className="text-[10px] text-text-lo mt-2">
          ostatnie 7 tygodni{hasScaling ? ' · bursztyn = skalowanie' : ''}
        </p>
      </div>

      {/* Ad grid */}
      <div className="bg-bg-surface border border-line rounded-2xl p-4">
        <p className="text-xs font-medium text-text-mid mb-3">
          Aktywne reklamy tej marki ({brandAds.length})
        </p>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {sorted.map((ad) => (
            <button
              key={ad.id}
              onClick={() => onSelectAd?.(ad)}
              className="relative bg-bg-raised rounded-xl overflow-hidden"
              style={{ aspectRatio: '9/14' }}
              aria-label={ad.hook ?? ad.id}
            >
              <Image
                src={ad.creativeUrl}
                alt=""
                fill
                className="object-cover"
                sizes="80px"
                unoptimized
              />
              {/* Heat badge */}
              <div className="absolute top-1.5 left-1.5 bg-heat-deep rounded-full px-1.5 py-0.5">
                <span className="text-[9px] font-mono text-heat font-medium">
                  {Math.round(ad.heatScore)}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
