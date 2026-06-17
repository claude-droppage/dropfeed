'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import type { ProductCard, FeedSource } from '@/lib/types'
import { SwipeSpyLogo } from '@/components/SwipeSpyLogo'
import SignalChip from '@/components/ui/SignalChip'
import SourceToggle from '@/components/shell/SourceToggle'

const THUMB = 'rounded-xl flex items-center justify-center bg-gradient-to-b from-bg-raised to-bg-void'

export default function ProductsView({
  products,
  dateLabel,
}: {
  products: ProductCard[]
  dateLabel: string
}) {
  const [source, setSource] = useState<FeedSource>('facebook')

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
              <div className={`w-[74px] h-[74px] text-3xl shrink-0 ${THUMB}`}>{p.emoji}</div>
              <div className="flex-1 min-w-0 flex flex-col">
                <p className="text-[13.5px] font-semibold text-text-hi leading-tight">{p.name}</p>
                <p className="text-[11px] text-text-lo mt-0.5">{p.shop}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-2">
                  <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md bg-heat/10 text-heat">🔥 {p.heatScore}</span>
                  <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md bg-bg-raised text-text-mid">{p.adCount} reklam</span>
                  <span className="text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md bg-bg-raised text-text-mid">{p.niche}</span>
                </div>
              </div>
              <div className="text-sm font-bold text-text-hi self-start whitespace-nowrap">{p.price}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Desktop ──────────────────────────────────────────────── */}
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
            Sortuj: <b className="text-heat">Momentum ↓</b>
          </div>
        </div>

        {/* table head */}
        <div className="grid grid-cols-[2.6fr_2.4fr_90px_280px] gap-4 px-4 pb-2.5 text-[11px] font-semibold tracking-wider uppercase text-text-lo">
          <div>Produkt</div>
          <div>Sygnały odkrywania</div>
          <div className="text-center">Heat</div>
          <div>Reklamy</div>
        </div>

        <div className="flex flex-col gap-2.5">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              className="grid grid-cols-[2.6fr_2.4fr_90px_280px] gap-4 items-center bg-bg-surface border border-line rounded-[14px] px-4 py-3 hover:border-text-mid transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-[60px] h-[60px] text-3xl shrink-0 ${THUMB}`}>{p.emoji}</div>
                <div className="min-w-0">
                  <p className="text-[14.5px] font-semibold text-text-hi truncate">{p.name}</p>
                  <p className="text-xs text-text-lo">{p.shop} · {p.niche}</p>
                  <p className="text-[13px] font-bold text-text-hi mt-1">{p.price}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {p.signals.map((s, i) => <SignalChip key={i} signal={s} />)}
              </div>

              <div className="text-center">
                <div className="text-xl font-extrabold text-heat leading-none">{p.heatScore}</div>
                <div className="text-[10px] text-text-lo font-semibold mt-1">HEAT</div>
              </div>

              <AdStrip emoji={p.emoji} count={p.adCount} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function AdStrip({ emoji, count }: { emoji: string; count: number }) {
  const tiles = Math.min(3, count)
  const more = count - tiles
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: tiles }).map((_, i) => (
        <div key={i} className="w-16 h-[84px] rounded-[9px] border border-line bg-gradient-to-b from-bg-raised to-bg-void flex items-center justify-center text-2xl relative">
          {emoji}
          <span className="absolute w-[22px] h-[22px] rounded-full bg-bg-void/60 flex items-center justify-center text-[9px]">▶</span>
        </div>
      ))}
      {more > 0 && (
        <div className="w-16 h-[84px] rounded-[9px] border border-dashed border-line flex items-center justify-center text-xs font-semibold text-text-lo">
          +{more}
        </div>
      )}
    </div>
  )
}
