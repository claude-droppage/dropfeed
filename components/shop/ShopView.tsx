'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { TikTokShopResult, TikTokShopItem, ShopMarket } from '@/lib/types'

export default function ShopView({ us, pl }: { us: TikTokShopResult; pl: TikTokShopResult }) {
  const [market, setMarket] = useState<ShopMarket>('US')
  const data = market === 'US' ? us : pl

  return (
    <div className="h-full overflow-y-auto bg-bg-void">
      <div className="mx-auto max-w-xl md:max-w-6xl px-4 md:px-8 pt-4 pb-10">
        {/* header */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg md:text-[22px] font-bold tracking-tight text-text-hi">TikTok Shop</h1>
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-text-mid bg-bg-surface border border-line rounded-full px-2.5 py-1">
            <span className="text-profit">●</span> live
          </span>
        </div>

        {/* toggle PL / US */}
        <div className="flex bg-bg-surface border border-line rounded-[10px] p-[3px] gap-0.5 mb-5 max-w-xs">
          {(['PL', 'US'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMarket(m)}
              className={`flex-1 text-[13px] font-semibold py-2 rounded-[7px] transition-colors ${
                market === m ? 'bg-heat text-[#0a0b0d]' : 'text-text-mid hover:text-text-hi'
              }`}
            >
              {m === 'PL' ? '🇵🇱 Polska' : '🇺🇸 USA'}
            </button>
          ))}
        </div>

        {data.state === 'live' ? (
          <>
            <div className="mb-3">
              <h2 className="text-base font-bold text-text-hi">Bestsellery</h2>
              <p className="text-xs text-text-lo mt-0.5">Realne liczby sprzedaży · sortowane po sprzedaży</p>
            </div>
            {/* mobile — karty */}
            <div className="flex flex-col gap-2.5 md:hidden">
              {data.items.map((it) => <ShopRow key={it.id} item={it} />)}
            </div>
            {/* desktop — tabela Kalodata-style */}
            <div className="hidden md:block">
              <ShopTable items={data.items} />
            </div>
          </>
        ) : (
          <>
            {/* świeży rynek PL */}
            <div className="rounded-2xl border border-dashed border-line px-5 py-6 text-center mb-6 max-w-xl">
              <div className="text-3xl mb-2">🌱</div>
              <p className="text-sm font-semibold text-text-hi mb-1.5">Rynek PL śledzimy od dnia zero</p>
              <p className="text-[12px] text-text-lo leading-relaxed">
                TikTok Shop ruszył w Polsce 15 czerwca. Zbieramy dane sprzedaży od startu — bestsellery pojawią się tu, gdy uzbiera się pierwsza sprzedaż. Jesteś wśród pierwszych, którzy to zobaczą.
              </p>
            </div>
            {data.firstMoves && data.firstMoves.length > 0 && (
              <>
                <h2 className="text-[15px] font-bold text-text-hi mb-2.5">Pierwsze ruchy</h2>
                <div className="flex flex-col gap-2.5 max-w-xl">
                  {data.firstMoves.map((it) => <ShopRow key={it.id} item={it} />)}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── mobile: karta ──────────────────────────────────────────────────────────
function ShopRow({ item }: { item: TikTokShopItem }) {
  const cls = 'flex items-center gap-3 bg-bg-surface border border-line rounded-[13px] px-3 py-2.5'
  const inner = (
    <>
      <span className="w-5 text-center text-sm font-extrabold text-text-lo shrink-0">{item.rank}</span>
      <span className="w-[46px] h-[46px] rounded-[9px] shrink-0 overflow-hidden flex items-center justify-center text-2xl bg-gradient-to-b from-bg-raised to-bg-void">
        {item.thumbUrl ? <img src={item.thumbUrl} alt="" loading="lazy" className="w-full h-full object-cover" /> : item.emoji}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-text-hi truncate">{item.name}</p>
        <p className="text-[12px] mt-1">
          <span className="font-bold text-profit">{item.sold}</span>
          <span className="text-text-lo font-medium text-[11px]"> sprzedanych</span>
          {item.price && <span className="text-text-mid"> · {item.price}</span>}
        </p>
      </div>
      {item.trend && <span className="text-[12px] font-bold text-profit whitespace-nowrap">{item.trend}</span>}
    </>
  )
  // klik → wewnętrzny deep-dive /shop/[id] (link do TikTok jest na deep-dive)
  return <Link href={`/shop/${item.id}`} className={`${cls} hover:border-text-mid transition-colors`}>{inner}</Link>
}

// ── desktop: tabela ──────────────────────────────────────────────────────────
function ShopTable({ items }: { items: TikTokShopItem[] }) {
  const router = useRouter()
  return (
    <div className="rounded-2xl border border-line overflow-hidden">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-bg-surface text-[11px] uppercase tracking-wide text-text-lo">
            <th className="font-semibold px-4 py-3 w-10">#</th>
            <th className="font-semibold px-4 py-3">Produkt</th>
            <th className="font-semibold px-4 py-3 text-right whitespace-nowrap">Sprzedane sztuki</th>
            <th className="font-semibold px-4 py-3 whitespace-nowrap">Wzrost / trend</th>
            <th className="font-semibold px-4 py-3 text-right whitespace-nowrap">Śr. cena</th>
            <th className="font-semibold px-4 py-3 text-right whitespace-nowrap">Twórcy</th>
            <th className="font-semibold px-4 py-3 whitespace-nowrap">Data od</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr
              key={it.id}
              onClick={() => router.push(`/shop/${it.id}`)}
              className="border-t border-line bg-bg-void hover:bg-bg-surface transition-colors cursor-pointer align-middle"
            >
              <td className="px-4 py-3 text-sm font-extrabold text-text-lo">{it.rank}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-11 h-11 rounded-[9px] shrink-0 overflow-hidden flex items-center justify-center text-xl bg-gradient-to-b from-bg-raised to-bg-void">
                    {it.thumbUrl ? <img src={it.thumbUrl} alt="" loading="lazy" className="w-full h-full object-cover" /> : it.emoji}
                  </span>
                  <div className="min-w-0 max-w-[320px]">
                    <p className="text-[13px] font-semibold text-text-hi truncate">{it.name}</p>
                    <p className="text-[11px] text-text-lo mt-0.5 flex items-center gap-1.5">
                      {it.rating != null && <span className="text-heat">★ {it.rating}</span>}
                      {it.reviewCount != null && <span>{fmtNum(it.reviewCount)} opinii</span>}
                      {it.price && <span className="text-text-mid">· {it.price}</span>}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <span className="text-[14px] font-bold text-profit">{it.sold}</span>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {it.growthPct != null ? (
                    <span className={`text-[12px] font-bold ${it.growthPct >= 0 ? 'text-profit' : 'text-text-mid'}`}>
                      {it.growthPct >= 0 ? '▲' : '▼'} {Math.abs(it.growthPct)}%
                    </span>
                  ) : (
                    <span className="text-[11px] text-text-lo">—</span>
                  )}
                  {it.salesSeries && it.salesSeries.length >= 2 && (
                    <Sparkline data={it.salesSeries} />
                  )}
                </div>
              </td>
              <td className="px-4 py-3 text-right text-[13px] text-text-hi whitespace-nowrap">{it.price ?? '—'}</td>
              <td className="px-4 py-3 text-right text-[13px] text-text-hi">{it.creatorsCount != null && it.creatorsCount > 0 ? it.creatorsCount : '—'}</td>
              <td className="px-4 py-3 text-[12px] text-text-mid whitespace-nowrap">{fmtDate(it.dateFrom)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// sparkline ze snapshotów (pusto dopóki <2 punkty — obsłużone wyżej)
function Sparkline({ data }: { data: number[] }) {
  const w = 56, h = 18
  const min = Math.min(...data), max = Math.max(...data)
  const span = max - min || 1
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / span) * h}`)
    .join(' ')
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden>
      <polyline points={pts} fill="none" stroke="var(--color-profit)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

const fmtNum = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')} tys.` : String(n))

function fmtDate(d?: string): string {
  if (!d) return '—'
  // first_live_time bywa ISO lub unix (sekundy); spróbuj sparsować
  const asNum = Number(d)
  const date = Number.isFinite(asNum) && asNum > 1e9 ? new Date(asNum * 1000) : new Date(d)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })
}
