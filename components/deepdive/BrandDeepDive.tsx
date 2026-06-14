'use client'

import Image from 'next/image'
import { ExternalLink, Clock, Layers, Play, ImageIcon } from 'lucide-react'
import type { Brand, Ad } from '@/lib/types'

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.', ',')}k`
  return String(n)
}

function platformLabel(p: string): string {
  const map: Record<string, string> = { FACEBOOK: 'Facebook', INSTAGRAM: 'Instagram', AUDIENCE_NETWORK: 'Audience Network', MESSENGER: 'Messenger', THREADS: 'Threads' }
  return map[p] ?? p.charAt(0) + p.slice(1).toLowerCase()
}

function daysActive(startDate: string): number {
  const ms = Date.now() - new Date(startDate).getTime()
  return Math.max(0, Math.floor(ms / 86_400_000))
}

interface Props {
  brand: Brand
  /** konkretna oglądana reklama — deep dive jest ad-centryczny */
  ad: Ad
  /** liczba aktywnych reklam marki (COUNT z naszej bazy; fallback gdy brak snapshotu) */
  brandAdCount: number
  /** snapshoty osi skalowania (liczba aktywnych reklam w czasie) */
  snapshots?: { day: string; count: number }[]
}

export default function BrandDeepDive({ brand, ad, brandAdCount, snapshots = [] }: Props) {
  const adLibraryUrl = brand.fbPageId
    ? `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&view_all_page_id=${brand.fbPageId}`
    : null
  const platforms = ad.platforms ?? []
  const stat = 'flex items-center justify-between text-[13px] py-2 border-b border-line last:border-0'
  // prawdziwa liczba aktywnych reklam marki = ostatni snapshot (z FB), inaczej count z bazy
  const activeCount = snapshots.length ? snapshots[snapshots.length - 1].count : brandAdCount
  const maxSnap = Math.max(1, ...snapshots.map((s) => s.count))

  return (
    <div className="flex flex-col gap-4">
      {/* Brand header — logo (fallback inicjały) */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-bg-raised border border-line overflow-hidden flex items-center justify-center text-[13px] font-medium text-profit shrink-0">
          {brand.logoUrl ? (
            <Image src={brand.logoUrl} alt="" width={44} height={44} className="w-full h-full object-cover" />
          ) : (
            brand.avatarInitials
          )}
        </div>
        <div className="min-w-0">
          <p className="text-text-hi font-medium text-[15px] leading-tight truncate">{brand.name}</p>
          <p className="text-text-lo text-xs mt-0.5">
            {brand.igFollowers ? `${formatCount(brand.igFollowers)} polubień · ` : ''}
            {activeCount} aktywnych reklam
          </p>
        </div>
      </div>

      {/* Linki: sklep + FB Ad Library */}
      <div className="flex gap-2 flex-wrap">
        {brand.storeUrl && (
          <a href={brand.storeUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-text-mid bg-bg-raised border border-line rounded-full px-3 py-1.5 hover:border-line/60 transition-colors">
            sklep <ExternalLink size={11} />
          </a>
        )}
        {adLibraryUrl && (
          <a href={adLibraryUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-text-mid bg-bg-raised border border-line rounded-full px-3 py-1.5 hover:border-line/60 transition-colors">
            reklamy w FB Ad Library <ExternalLink size={11} />
          </a>
        )}
      </div>

      {/* Dane TEJ reklamy */}
      <div className="bg-bg-surface border border-line rounded-2xl px-4 py-1">
        <div className={stat}>
          <span className="text-text-lo flex items-center gap-1.5"><Clock size={13} /> aktywna od</span>
          <span className="text-text-hi font-mono">{daysActive(ad.startDate)} dni</span>
        </div>
        <div className={stat}>
          <span className="text-text-lo">start</span>
          <span className="text-text-hi font-mono">{ad.startDate}</span>
        </div>
        <div className={stat}>
          <span className="text-text-lo flex items-center gap-1.5">
            {ad.format === 'video' ? <Play size={13} /> : <ImageIcon size={13} />} format
          </span>
          <span className="text-text-hi">{ad.format === 'video' ? 'wideo' : 'obraz'}</span>
        </div>
        {platforms.length > 0 && (
          <div className={stat}>
            <span className="text-text-lo">platformy</span>
            <span className="text-text-hi">{platforms.map(platformLabel).join(', ')}</span>
          </div>
        )}
        <div className={stat}>
          <span className="text-text-lo flex items-center gap-1.5"><Layers size={13} /> warianty kreacji</span>
          <span className="text-text-hi font-mono">{ad.variantsCount ?? 1}</span>
        </div>
      </div>

      {/* Oś skalowania — realne snapshoty (gdy ≥2); inaczej info o zbieraniu danych */}
      <div className="bg-bg-surface border border-line rounded-2xl p-4">
        <p className="text-xs font-medium text-text-mid mb-3">Oś skalowania — aktywne reklamy marki</p>
        {snapshots.length >= 2 ? (
          <>
            <div className="flex items-end gap-[5px] h-14">
              {snapshots.map((s, i) => (
                <div
                  key={s.day}
                  className={`flex-1 rounded-t-[3px] ${i === snapshots.length - 1 ? 'bg-heat' : 'bg-line'}`}
                  style={{ height: `${Math.max(6, Math.round((s.count / maxSnap) * 100))}%` }}
                  title={`${s.day}: ${s.count}`}
                />
              ))}
            </div>
            <p className="text-[10px] text-text-lo mt-2">snapshoty co 2 tygodnie · bursztyn = teraz</p>
          </>
        ) : (
          <p className="text-[11px] text-text-lo">dane historyczne w przygotowaniu (zbieramy snapshoty co 2 tyg.)</p>
        )}
      </div>
    </div>
  )
}
