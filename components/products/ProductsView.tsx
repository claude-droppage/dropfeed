'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, ExternalLink } from 'lucide-react'
import type { ProductCard, FeedSource } from '@/lib/types'
import { SwipeSpyLogo } from '@/components/SwipeSpyLogo'
import SignalChip from '@/components/ui/SignalChip'
import SourceToggle from '@/components/shell/SourceToggle'

const THUMB = 'rounded-xl flex items-center justify-center bg-gradient-to-b from-bg-raised to-bg-void'
const FLAG: Record<string, string> = { PL: '🇵🇱', US: '🇺🇸', GB: '🇬🇧', UK: '🇬🇧', DE: '🇩🇪', FR: '🇫🇷', ES: '🇪🇸', IT: '🇮🇹' }
const flag = (c?: string) => (c ? FLAG[c.toUpperCase()] ?? '🌍' : '🌍')

export default function ProductsView({
  products,
  dateLabel,
}: {
  products: ProductCard[]
  dateLabel: string
}) {
  const [source, setSource] = useState<FeedSource>('facebook')
  const router = useRouter()

  return (
    <div className="h-full overflow-y-auto bg-bg-void">
      {/* ── Mobile ───────────────────────────────────────────────── */}
      <div className="md:hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <SwipeSpyLogo className="text-[1.15rem]" />
        </div>
        <div className="px-4 pb-2">
          <SourceToggle value={source} onChange={setSource} full />
        </div>
        <div className="px-4 pt-2 pb-3">
          <h2 className="text-text-hi text-lg font-bold tracking-tight">Dziś dla Ciebie</h2>
          <p className="text-text-lo text-xs mt-0.5">{products.length} produktów · {dateLabel}</p>
        </div>
        <div className="px-3 pb-6 flex flex-col gap-2.5">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              className="flex gap-3 bg-bg-surface border border-line rounded-2xl p-2.5 active:border-text-mid transition-colors"
            >
              <div className={`w-[74px] h-[74px] text-3xl shrink-0 overflow-hidden ${THUMB}`}>
                {p.thumbUrl ? <img src={p.thumbUrl} alt="" loading="lazy" className="w-full h-full object-cover" /> : p.emoji}
              </div>
              <div className="flex-1 min-w-0 flex flex-col">
                <p className="text-[13.5px] font-semibold text-text-hi leading-tight">{p.name}</p>
                <p className="text-[11px] text-text-lo mt-0.5">{p.shop}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-2">
                  <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md bg-heat/10 text-heat">🔥 {p.heatScore}</span>
                  <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md bg-bg-raised text-text-mid">{p.adCount} reklam</span>
                  {p.daysActive != null && <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md bg-bg-raised text-text-mid">{p.daysActive}d</span>}
                  <span className="text-[10.5px]">{flag(p.country)}</span>
                </div>
              </div>
              <div className="text-sm font-bold text-text-hi self-start whitespace-nowrap">{p.price}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Desktop — galeria kart (Minea/WinningHunter style) ────── */}
      <div className="hidden md:block px-7 py-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h1 className="text-[22px] font-bold tracking-tight text-text-hi">
            Produkty <span className="text-text-lo text-sm font-medium ml-1.5">typy dnia · {dateLabel}</span>
          </h1>
          <SourceToggle value={source} onChange={setSource} />
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 flex items-center gap-2.5 bg-bg-surface border border-line rounded-[10px] px-3.5 py-2.5 text-text-lo text-[13px]">
            <Search size={15} /> Szukaj produktu, sklepu lub domeny…
          </div>
          <div className="bg-bg-surface border border-line rounded-[10px] px-3.5 py-2.5 text-[13px] text-text-mid font-medium">
            Sortuj: <b className="text-heat">Heat ↓</b>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="py-20 text-center text-text-lo text-sm">Brak produktów do pokazania.</div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {products.map((p, i) => (
              <GalleryCard key={p.id} p={p} rank={i + 1} onOpen={() => router.push(`/products/${p.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function GalleryCard({ p, rank, onOpen }: { p: ProductCard; rank: number; onOpen: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className="group bg-bg-surface border border-line rounded-2xl overflow-hidden cursor-pointer hover:border-text-mid transition-colors outline-none focus-visible:ring-2 focus-visible:ring-heat/40"
    >
      {/* duża kreacja + overlay rank/heat (+ top sygnał) */}
      <div className="relative aspect-[4/5] bg-bg-raised overflow-hidden">
        {p.thumbUrl ? (
          <img src={p.thumbUrl} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">{p.emoji}</div>
        )}
        <span className="absolute top-2 left-2 text-[11px] font-bold text-text-hi bg-bg-void/70 backdrop-blur px-2 py-1 rounded-md">#{rank}</span>
        <span className="absolute top-2 right-2 text-[11px] font-bold text-heat bg-bg-void/70 backdrop-blur px-2 py-1 rounded-md">🔥 {p.heatScore}</span>
        {p.signals[0] && <span className="absolute bottom-2 left-2"><SignalChip signal={p.signals[0]} /></span>}
      </div>

      {/* meta — tylko twarde dane */}
      <div className="p-3">
        <p className="text-sm font-semibold text-text-hi leading-snug line-clamp-2 min-h-[2.5em]">{p.name}</p>
        <p className="text-[11px] text-text-lo mt-0.5 truncate">{p.shop}</p>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-[11px] text-text-mid mt-2">
          <span>{p.adCount} reklam</span>
          {p.daysActive != null && <><span className="text-text-lo">·</span><span>{p.daysActive}d aktywna</span></>}
          <span className="text-text-lo">·</span><span>{flag(p.country)}</span>
          {p.price && <><span className="text-text-lo">·</span><span className="font-semibold text-text-hi">{p.price}</span></>}
        </div>
        {p.adLibraryUrl && (
          <a
            href={p.adLibraryUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[11px] text-heat mt-2 hover:underline"
          >
            otwórz reklamę <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  )
}
