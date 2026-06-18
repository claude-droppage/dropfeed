'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ShopFeed, PropozycjaItem } from '@/lib/types'

type Market = 'PL' | 'US'
type Sort = 'rising' | 'fresh' | 'jump' | 'double' | 'bestsellers'

const fmt = (n?: number | null) =>
  n == null ? '—' : n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')} tys.` : String(Math.round(n))

// kolor akcentu wg sygnału: mint=rank, amber=świeży, blue=podwójny
const ACCENT: Record<string, string> = { rank: 'bg-profit', fresh: 'bg-heat', double: 'bg-blue', rise: 'bg-profit' }

export default function ShopView({ feed }: { feed: ShopFeed }) {
  const [market, setMarket] = useState<Market>('US')
  const [sort, setSort] = useState<Sort>('rising')
  const router = useRouter()

  const sorted = useMemo(() => sortAll(feed.all, sort), [feed.all, sort])

  return (
    <div className="h-full overflow-y-auto bg-bg-void">
      <div className="mx-auto max-w-xl md:max-w-6xl px-4 md:px-8 pt-4 pb-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg md:text-[22px] font-bold tracking-tight text-text-hi">TikTok Shop</h1>
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-text-mid bg-bg-surface border border-line rounded-full px-2.5 py-1">
            <span className="text-profit">●</span> live
          </span>
        </div>

        <div className="flex bg-bg-surface border border-line rounded-[10px] p-[3px] gap-0.5 mb-5 max-w-xs">
          {(['PL', 'US'] as const).map((m) => (
            <button key={m} type="button" onClick={() => setMarket(m)}
              className={`flex-1 text-[13px] font-semibold py-2 rounded-[7px] transition-colors ${market === m ? 'bg-heat text-[#0a0b0d]' : 'text-text-mid hover:text-text-hi'}`}>
              {m === 'PL' ? '🇵🇱 Polska' : '🇺🇸 USA'}
            </button>
          ))}
        </div>

        {market === 'PL' ? (
          <div className="rounded-2xl border border-dashed border-line px-5 py-6 text-center max-w-xl">
            <div className="text-3xl mb-2">🌱</div>
            <p className="text-sm font-semibold text-text-hi mb-1.5">Rynek PL — świeży, wkrótce</p>
            <p className="text-[12px] text-text-lo leading-relaxed">
              TikTok Shop ruszył w Polsce 15 czerwca. Zbieramy dane od startu — perełki pojawią się tu, gdy uzbiera się pierwsza sprzedaż.
            </p>
          </div>
        ) : (
          <>
            {/* ── Nowe perełki — karuzel ── */}
            {feed.gems.length > 0 && (
              <section className="mb-6">
                <div className="flex items-baseline justify-between mb-2.5">
                  <h2 className="text-base font-bold text-text-hi">Nowe perełki</h2>
                  <span className="text-[11px] text-text-lo">{feed.counts.gems} z sygnałem</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 snap-x">
                  {feed.gems.map((g) => <GemCard key={g.productId} it={g} onOpen={() => router.push(`/shop/${g.productId}`)} />)}
                </div>
              </section>
            )}

            {/* ── Sort bar ── */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-3 -mx-4 px-4 md:mx-0 md:px-0">
              <SortPill active={sort === 'rising'} onClick={() => setSort('rising')}>Nowe i rosnące</SortPill>
              <SortPill active={sort === 'fresh'} onClick={() => setSort('fresh')}>Świeże</SortPill>
              <SortPill active={sort === 'jump'} onClick={() => setSort('jump')}>Największy skok</SortPill>
              <SortPill active={sort === 'double'} onClick={() => setSort('double')}>Podwójny sygnał</SortPill>
              <span className="flex-1" />
              <SortPill active={sort === 'bestsellers'} onClick={() => setSort('bestsellers')} muted>Bestsellery</SortPill>
            </div>

            {/* ── Wszystkie produkty — rise-first ── */}
            <div className="flex items-baseline justify-between mb-2.5">
              <h2 className="text-base font-bold text-text-hi">Wszystkie produkty</h2>
              <span className="text-[11px] text-text-lo font-mono">{feed.counts.tracked} śledzonych</span>
            </div>

            {/* mobile: karty */}
            <div className="flex flex-col gap-2 md:hidden">
              {sorted.map((it, i) => <RiseRow key={it.productId} it={it} rank={i + 1} onOpen={() => router.push(`/shop/${it.productId}`)} />)}
            </div>
            {/* desktop: tabela */}
            <div className="hidden md:block">
              <RiseTable items={sorted} onOpen={(id) => router.push(`/shop/${id}`)} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function sortAll(all: PropozycjaItem[], sort: Sort): PropozycjaItem[] {
  const a = [...all]
  const sv = (x?: number | null) => x ?? -1
  switch (sort) {
    case 'fresh': return a.sort((x, y) => Number(y.isFresh) - Number(x.isFresh) || x.daysTracked - y.daysTracked || sv(y.sold24h) - sv(x.sold24h))
    case 'jump': return a.sort((x, y) => sv(y.rankDelta) - sv(x.rankDelta) || sv(y.sold24h) - sv(x.sold24h))
    case 'double': return a.sort((x, y) => Number(y.isDouble) - Number(x.isDouble) || sv(y.sold24h) - sv(x.sold24h))
    case 'bestsellers': return a.sort((x, y) => sv(y.salesVolume) - sv(x.salesVolume))
    default: return a.sort((x, y) => sv(y.rankDelta) - sv(x.rankDelta) || sv(y.sold24h) - sv(x.sold24h) || sv(y.salesVolume) - sv(x.salesVolume))
  }
}

function SortPill({ active, muted, onClick, children }: { active: boolean; muted?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
        active ? 'bg-heat/15 text-heat border-heat/30'
        : muted ? 'bg-transparent text-text-lo border-line hover:text-text-mid'
        : 'bg-bg-surface text-text-mid border-line hover:text-text-hi'}`}>
      {children}
    </button>
  )
}

// chip wzrostu — eksponuje velocity/skok, NIE lifetime
function GrowthChip({ it }: { it: PropozycjaItem }) {
  if (it.rankDelta != null && it.rankDelta > 0 && it.rank != null)
    return <span className="text-[11px] font-bold text-profit font-mono">▲ #{it.rank + it.rankDelta}→#{it.rank}</span>
  if (it.sold24h != null && it.sold24h > 0)
    return <span className="text-[11px] font-bold text-profit font-mono">▲ +{fmt(it.sold24h)}/24h</span>
  return null
}
function Badges({ it }: { it: PropozycjaItem }) {
  return (
    <>
      {it.isFresh && <span className="text-[10px] font-semibold text-heat bg-heat/12 px-1.5 py-0.5 rounded">✦ nowy</span>}
      {it.isDouble && <span className="text-[10px] font-semibold text-blue bg-blue/12 px-1.5 py-0.5 rounded font-mono">⌖ {it.adCount} FB</span>}
    </>
  )
}

// ── karta perełki (karuzel) ──────────────────────────────────────────────────
function GemCard({ it, onOpen }: { it: PropozycjaItem; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen}
      className="snap-start shrink-0 w-[164px] md:w-[190px] text-left bg-bg-surface border border-line rounded-2xl overflow-hidden hover:border-text-mid transition-colors">
      <div className={`h-1 ${ACCENT[it.signal ?? 'rise']}`} />
      <div className="aspect-square bg-bg-raised overflow-hidden flex items-center justify-center text-3xl">
        {it.imageUrl ? <img src={it.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" /> : '🛒'}
      </div>
      <div className="p-2.5">
        <p className="text-[12.5px] font-semibold text-text-hi leading-snug line-clamp-2 min-h-[2.4em]">{it.title}</p>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap"><GrowthChip it={it} /></div>
        <div className="flex items-center gap-1 mt-1.5 flex-wrap"><Badges it={it} /></div>
        <p className="text-[10.5px] text-text-lo mt-1.5 font-mono">{it.price != null ? `$${it.price}` : ''} {it.salesVolume != null ? `· ${fmt(it.salesVolume)} łącznie` : ''}</p>
      </div>
    </button>
  )
}

// ── wiersz rise-first (mobile) ───────────────────────────────────────────────
function RiseRow({ it, rank, onOpen }: { it: PropozycjaItem; rank: number; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="w-full flex items-center gap-3 bg-bg-surface border border-line rounded-[13px] px-3 py-2.5 text-left hover:border-text-mid transition-colors">
      <span className="w-5 text-center text-sm font-extrabold text-text-lo shrink-0 font-mono">{rank}</span>
      <span className="w-[46px] h-[46px] rounded-[9px] shrink-0 overflow-hidden flex items-center justify-center text-2xl bg-bg-raised">
        {it.imageUrl ? <img src={it.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" /> : '🛒'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-text-hi truncate">{it.title}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <GrowthChip it={it} /><Badges it={it} />
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-[12px] font-mono text-text-mid">{fmt(it.salesVolume)}</div>
        <div className="text-[10px] text-text-lo">łącznie</div>
      </div>
    </button>
  )
}

// ── tabela rise-first (desktop) ──────────────────────────────────────────────
function RiseTable({ items, onOpen }: { items: PropozycjaItem[]; onOpen: (id: string) => void }) {
  return (
    <div className="rounded-2xl border border-line overflow-hidden">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-bg-surface text-[11px] uppercase tracking-wide text-text-lo">
            <th className="font-semibold px-4 py-3 w-8">#</th>
            <th className="font-semibold px-4 py-3">Produkt</th>
            <th className="font-semibold px-4 py-3 whitespace-nowrap">Wzrost</th>
            <th className="font-semibold px-4 py-3">Sygnał</th>
            <th className="font-semibold px-4 py-3 text-right whitespace-nowrap">Cena</th>
            <th className="font-semibold px-4 py-3 text-right whitespace-nowrap">Sprzedane łącznie</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={it.productId} onClick={() => onOpen(it.productId)}
              className="border-t border-line bg-bg-void hover:bg-bg-surface transition-colors cursor-pointer">
              <td className="px-4 py-3 text-sm font-extrabold text-text-lo font-mono">{i + 1}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 rounded-[9px] shrink-0 overflow-hidden flex items-center justify-center text-lg bg-bg-raised">
                    {it.imageUrl ? <img src={it.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" /> : '🛒'}
                  </span>
                  <span className="min-w-0 max-w-[380px]">
                    <span className="block text-[13px] font-semibold text-text-hi truncate">{it.title}</span>
                    {it.rating != null && <span className="block text-[11px] text-text-lo"><span className="text-heat">★ {it.rating}</span>{it.reviewCount != null ? ` · ${fmt(it.reviewCount)} opinii` : ''}</span>}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap"><GrowthChip it={it} /></td>
              <td className="px-4 py-3"><div className="flex items-center gap-1.5"><Badges it={it} /></div></td>
              <td className="px-4 py-3 text-right text-[13px] text-text-hi font-mono whitespace-nowrap">{it.price != null ? `$${it.price}` : '—'}</td>
              <td className="px-4 py-3 text-right text-[13px] text-text-mid font-mono whitespace-nowrap">{fmt(it.salesVolume)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
