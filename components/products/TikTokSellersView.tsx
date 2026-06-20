'use client'

import { useState } from 'react'
import { ArrowUpRight, Play, Store } from 'lucide-react'
import type { TikTokSeller } from '@/lib/types'

const fmtViews = (n?: number): string => {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')} mln`
  if (n >= 1_000) return `${Math.round(n / 1_000)} tys.`
  return String(n)
}

function SellerCard({ s }: { s: TikTokSeller }) {
  const [broken, setBroken] = useState(false)
  const profile = `https://www.tiktok.com/@${s.handle}`
  return (
    <div className="rounded-2xl border border-line bg-bg-surface overflow-hidden">
      {/* cover → najlepszy filmik na TikToku */}
      <a href={s.bestVideoUrl || profile} target="_blank" rel="noopener noreferrer" className="block relative aspect-[3/4] bg-bg-raised group">
        {s.bestVideoCover && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.bestVideoCover} alt={s.handle} loading="lazy" onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-text-lo text-xs">@{s.handle}</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-bg-void/75 backdrop-blur px-2 py-0.5">
          <Play size={11} className="text-text-hi fill-current" />
          <span className="font-mono text-[11px] text-text-hi">{fmtViews(s.bestVideoPlaycount)}</span>
        </div>
        {s.crossSource && (
          <span className="absolute top-2 right-2 rounded-full bg-[var(--blue)]/20 border border-[var(--blue)]/40 text-[var(--blue)] text-[10px] font-medium px-2 py-0.5">
            FB×TikTok
          </span>
        )}
      </a>
      {/* meta */}
      <div className="px-3 py-2.5">
        <a href={profile} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-text-hi text-sm font-medium hover:text-white">
          <span className="truncate">@{s.handle}</span>
          <ArrowUpRight size={13} className="text-text-lo shrink-0" />
        </a>
        {s.storeUrl ? (
          <a href={s.storeUrl} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 text-[12px] text-[var(--profit)] hover:underline">
            <Store size={12} className="shrink-0" />
            <span className="truncate">{s.storeDomain}</span>
          </a>
        ) : (
          <div className="mt-1 flex items-center gap-1 text-[12px] text-text-mid"><Store size={12} /> <span className="truncate">{s.storeDomain}</span></div>
        )}
      </div>
    </div>
  )
}

export default function TikTokSellersView({ sellers }: { sellers: TikTokSeller[] }) {
  if (!sellers.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line px-5 py-10 text-center">
        <div className="text-2xl mb-1.5">🛍️</div>
        <p className="text-sm font-semibold text-text-hi mb-1">Brak sprzedawców</p>
        <p className="text-[12px] text-text-lo">Pula narasta po kolejnych przebiegach sweepu.</p>
      </div>
    )
  }
  return (
    <>
      <p className="text-[12px] text-text-mid mb-4">
        Organiczni sprzedawcy z TikToka ze zweryfikowanym sklepem Shopify (bio → realny sklep). Sort wg wyświetleń najlepszego filmiku. Realne liczby.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {sellers.map((s) => <SellerCard key={s.handle} s={s} />)}
      </div>
    </>
  )
}
