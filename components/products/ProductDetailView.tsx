'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bookmark, ExternalLink } from 'lucide-react'
import type { ProductDetail, AdMini } from '@/lib/types'

const isMp4 = (u?: string) => !!u && /\.(mp4|webm|mov)(\?|$)/i.test(u)

// kafelek kreacji — odtwarza wideo na hover (poster=miniatura), fallback obraz
function AdTile({ ad }: { ad: AdMini }) {
  const vid = useRef<HTMLVideoElement>(null)
  const playable = ad.format === 'video' && isMp4(ad.creativeUrl)
  return (
    <div
      onMouseEnter={() => playable && vid.current?.play().catch(() => {})}
      onMouseLeave={() => { if (playable && vid.current) { vid.current.pause(); vid.current.currentTime = 0 } }}
      className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-line bg-bg-raised flex items-center justify-center text-3xl"
    >
      {playable ? (
        <video ref={vid} src={ad.creativeUrl} poster={ad.thumbUrl} muted loop playsInline preload="none" className="w-full h-full object-cover" />
      ) : ad.thumbUrl ? (
        <img src={ad.thumbUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
      ) : ad.emoji}
      <span className="absolute top-1.5 left-1.5 text-[10px] font-bold text-heat bg-bg-void/70 px-1.5 py-0.5 rounded font-mono">🔥{ad.heatScore}</span>
      {playable && <span className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-bg-void/60 flex items-center justify-center text-[11px] group-hover:opacity-0 transition-opacity">▶</span>}
    </div>
  )
}

// Deep-dive produktu — jedna wyśrodkowana kolumna (mobile + desktop). Dane mock
// z getProductDetail. „Zapisz" wizualne (boardy na koncie = osobna mini-faza).
export default function ProductDetailView({ product: p }: { product: ProductDetail }) {
  return (
    <div className="h-full overflow-y-auto bg-bg-void">
      <div className="mx-auto max-w-lg px-5 pt-4 pb-10">
        {/* top bar */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/products" className="inline-flex items-center gap-1.5 text-text-mid text-sm hover:text-text-hi transition-colors">
            <ArrowLeft size={16} /> Produkty
          </Link>
          <span className="w-9 h-9 rounded-full border border-line flex items-center justify-center text-text-mid">
            <Bookmark size={16} />
          </span>
        </div>

        {/* hero */}
        <div className="w-full h-[150px] rounded-2xl overflow-hidden bg-gradient-to-b from-bg-raised to-bg-void flex items-center justify-center text-6xl mb-3.5">
          {p.thumbUrl ? <img src={p.thumbUrl} alt="" className="w-full h-full object-cover" /> : p.emoji}
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-text-hi leading-tight">{p.name}</h1>
        <p className="text-[13px] text-text-mid mt-1.5 mb-4">
          {p.shop} · {p.price} · <span className={p.status === 'active' ? 'text-profit font-medium' : 'text-text-lo'}>{p.status === 'active' ? 'aktywny' : 'nieaktywny'}</span>
        </p>

        {/* stats */}
        <div className="grid grid-cols-3 gap-2 mb-2">
          <Stat value={`🔥 ${p.heatScore}`} label="heat score" accent />
          <Stat value={String(p.adCount)} label="aktywne reklamy" />
          <Stat value={`${p.oldestAdDays} dni`} label="najstarsza" />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-6">
          <Stat value={p.markets.join(' ')} label="rynki" />
          <Stat value={p.formats} label="formaty" />
        </div>

        {/* ads — WSZYSTKIE kreatywy, klikalne (play), zdedupowane */}
        <h2 className="text-[13px] font-semibold text-text-mid mb-2.5">Reklamy tego produktu ({p.ads.length})</h2>
        <div className="grid grid-cols-3 gap-2.5">
          {p.ads.map((ad) => <AdTile key={ad.id} ad={ad} />)}
        </div>

        <a
          href={p.adLibraryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex items-center justify-center gap-2 bg-heat text-[#2A1700] text-sm font-semibold py-3 rounded-xl hover:brightness-110 transition-all"
        >
          Otwórz w bibliotece reklam <ExternalLink size={15} />
        </a>
      </div>
    </div>
  )
}

function Stat({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="bg-bg-surface border border-line rounded-xl px-3 py-2.5 text-center">
      <div className={`text-base font-bold ${accent ? 'text-heat' : 'text-text-hi'}`}>{value}</div>
      <div className="text-[10px] text-text-lo mt-0.5">{label}</div>
    </div>
  )
}
