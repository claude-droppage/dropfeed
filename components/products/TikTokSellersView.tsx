'use client'

import { useState } from 'react'
import { ArrowUpRight, Play, Store, Search } from 'lucide-react'
import type { TikTokSeller } from '@/lib/types'

const fmtViews = (n?: number): string => {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')} mln`
  if (n >= 1_000) return `${Math.round(n / 1_000)} tys.`
  return String(n)
}

function SellerCard({ s }: { s: TikTokSeller }) {
  const [broken, setBroken] = useState(false)
  const [playing, setPlaying] = useState(false)
  const profile = `https://www.tiktok.com/@${s.handle}`
  // ID filmiku z URL → oficjalny iframe-player (bez ciężkiego embed.js)
  const videoId = s.bestVideoUrl?.match(/\/video\/(\d+)/)?.[1]
  return (
    <div className="rounded-2xl border border-line bg-bg-surface overflow-hidden">
      <div className="relative aspect-[3/4] bg-bg-raised">
        {playing && videoId ? (
          <>
            {/* iframe ładowany DOPIERO po kliknięciu (lazy) — wideo gra u TikToka, 0 hostingu */}
            <iframe
              src={`https://www.tiktok.com/player/v1/${videoId}?autoplay=1&description=0&music_info=0&rel=0`}
              className="absolute inset-0 h-full w-full" frameBorder={0}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              referrerPolicy="strict-origin-when-cross-origin" title={`@${s.handle}`}
            />
            <a href={s.bestVideoUrl || profile} target="_blank" rel="noopener noreferrer"
              className="absolute bottom-2 right-2 z-10 rounded-full bg-bg-void/75 backdrop-blur px-2 py-0.5 text-[10px] text-text-hi inline-flex items-center gap-1">
              TikTok <ArrowUpRight size={11} />
            </a>
          </>
        ) : (
          // miniatura (R2) + klik = załaduj player; gdy brak ID → wyjście na TikToka
          <button type="button" onClick={() => videoId ? setPlaying(true) : window.open(s.bestVideoUrl || profile, '_blank')}
            className="absolute inset-0 w-full h-full group text-left">
            {s.bestVideoCover && !broken ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.bestVideoCover} alt={s.handle} loading="lazy" onError={() => setBroken(true)} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-text-lo text-xs">@{s.handle}</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute inset-0 grid place-items-center">
              <div className="w-11 h-11 rounded-full bg-bg-void/60 backdrop-blur grid place-items-center group-hover:bg-bg-void/80 transition-colors">
                <Play size={18} className="text-white fill-current translate-x-px" />
              </div>
            </div>
            <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-bg-void/75 backdrop-blur px-2 py-0.5">
              <Play size={11} className="text-text-hi fill-current" />
              <span className="font-mono text-[11px] text-text-hi">{fmtViews(s.bestVideoPlaycount)}</span>
            </div>
            {s.crossSource && (
              <span className="absolute top-2 right-2 rounded-full bg-[var(--blue)]/20 border border-[var(--blue)]/40 text-[var(--blue)] text-[10px] font-medium px-2 py-0.5">
                FB×TikTok
              </span>
            )}
          </button>
        )}
      </div>
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
        {s.aliQuery && (
          <a href={`https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(s.aliQuery)}`}
            target="_blank" rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-heat-deep border border-heat/30 text-heat text-[11px] px-2 py-0.5 hover:bg-heat/10 transition-colors">
            <Search size={11} /> AliExpress
          </a>
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
