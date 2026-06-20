'use client'

import { useState } from 'react'

export interface ReconAd {
  ad_id: string
  advertiser: string | null
  reach: string | null
  cta: string | null
  first_shown: string | null
  last_shown: string | null
  regions: string[] | null
  media_url: string | null
}

function days(a: string | null, b: string | null): number | null {
  if (!a || !b) return null
  const d = Math.round((Date.parse(b) - Date.parse(a)) / 86400000)
  return Number.isFinite(d) ? Math.max(d, 0) : null
}

function AdCard({ ad }: { ad: ReconAd }) {
  const [broken, setBroken] = useState(false)
  const live = days(ad.first_shown, ad.last_shown)
  return (
    <div className="rounded-2xl border border-line bg-bg-surface overflow-hidden">
      <div className="relative aspect-[9/12] bg-bg-raised">
        {ad.media_url && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ad.media_url}
            alt={ad.advertiser ?? ''}
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-text-lo text-xs px-3 text-center">
            kreacja TikTok<br />(miniatura wygasła)
          </div>
        )}
        {ad.cta && (
          <span className="absolute bottom-2 left-2 rounded-full bg-bg-void/80 backdrop-blur px-2.5 py-1 text-[11px] text-text-hi border border-line">
            {ad.cta}
          </span>
        )}
      </div>
      <div className="px-3 py-3">
        <div className="text-text-hi text-sm font-medium truncate">{ad.advertiser ?? '—'}</div>
        <div className="mt-1.5 flex flex-wrap gap-1.5 font-mono text-[11px] text-text-mid">
          {ad.regions?.length ? (
            <span className="rounded-full bg-bg-raised px-2 py-0.5">{ad.regions.join(' ')}</span>
          ) : null}
          {ad.reach ? <span className="rounded-full bg-bg-raised px-2 py-0.5">👁 {ad.reach}</span> : null}
          {live !== null ? (
            <span className="rounded-full bg-heat-deep text-heat px-2 py-0.5">{live}d na antenie</span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default function ReconAdGrid({ ads }: { ads: ReconAd[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {ads.map((a) => (
        <AdCard key={a.ad_id} ad={a} />
      ))}
    </div>
  )
}
