'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ChevronRight, User } from 'lucide-react'
import type { PropozycjeResult, PropozycjaItem } from '@/lib/types'

const fmt = (n?: number | null) =>
  n == null ? '—' : n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')} tys.` : String(Math.round(n))

// dzienne nowe sztuki do sparkline (mint, NIE $)
function dailyUnits(it: PropozycjaItem): number[] {
  return (it.series ?? []).map((p) => p.daily_units).filter((v): v is number => v != null && v >= 0)
}

export default function PropozycjeView({ data }: { data: PropozycjeResult }) {
  const [feed, setFeed] = useState<'tiktok' | 'ads'>('tiktok')
  const reduce = useReducedMotion()
  const td = data.typDnia

  const stagger = (i: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.04 * i, duration: 0.28 } }

  return (
    <div className="h-full overflow-y-auto bg-bg-void">
      <div className="mx-auto max-w-xl md:max-w-5xl px-4 md:px-8 pt-4 pb-10">
        {/* nagłówek */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-text-hi">Typy na dziś</h1>
            <p className="text-[12px] text-text-mid mt-0.5 leading-snug max-w-md">
              Codzienna selekcja najmocniejszych wzrostów — nie rozmiar bazy, tylko świeżość i powód przy każdym typie.
            </p>
          </div>
          <Link href="/profile" aria-label="Konto" className="shrink-0 w-9 h-9 rounded-full bg-bg-surface border border-line flex items-center justify-center text-text-mid hover:text-text-hi transition-colors">
            <User size={17} />
          </Link>
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-text-lo font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-profit animate-pulse" />
          zaktualizowano {data.meta.updatedDay ? 'dziś' : '—'} · {data.meta.shown} typów dziś · {data.meta.tracked} śledzonych
        </div>

        {/* toggle pod-feedów */}
        <div className="flex bg-bg-surface border border-line rounded-[10px] p-[3px] gap-0.5 my-5 max-w-sm">
          <button type="button" onClick={() => setFeed('tiktok')}
            className={`flex-1 text-[13px] font-semibold py-2 rounded-[7px] transition-colors ${feed === 'tiktok' ? 'bg-profit/15 text-profit' : 'text-text-mid hover:text-text-hi'}`}>
            TikTok Shop
          </button>
          <button type="button" onClick={() => setFeed('ads')}
            className={`flex-1 text-[13px] font-semibold py-2 rounded-[7px] transition-colors ${feed === 'ads' ? 'bg-heat/15 text-heat' : 'text-text-mid hover:text-text-hi'}`}>
            Reklamy · PL
          </button>
        </div>

        {feed === 'ads' ? (
          <div className="rounded-2xl border border-dashed border-line px-5 py-10 text-center">
            <div className="text-3xl mb-2">🏗️</div>
            <p className="text-sm font-semibold text-text-hi mb-1">Wkrótce — typy z polskich reklam</p>
            <p className="text-[12px] text-text-lo leading-relaxed max-w-sm mx-auto">
              Drugi pod-feed: najmocniejsze produkty wyłaniane z reklam FB/PL. Łączymy go z sygnałem TikToka (podwójny sygnał) — budujemy.
            </p>
          </div>
        ) : !td ? (
          <div className="rounded-2xl border border-dashed border-line px-5 py-10 text-center">
            <div className="text-3xl mb-2">🌱</div>
            <p className="text-sm font-semibold text-text-hi mb-1">Zbieram dane od dziś</p>
            <p className="text-[12px] text-text-lo leading-relaxed max-w-sm mx-auto">
              Historia sprzedaży dopiero startuje. Gdy uzbiera się ≥2 dni snapshotów, pojawią się tu typy z realnym sygnałem wzrostu.
            </p>
          </div>
        ) : (
          <>
            {/* ── mobile: karta + wiersze ── */}
            <div className="md:hidden">
              <motion.div {...stagger(0)} className="mb-6">
                <DayPick it={td} />
              </motion.div>
              {data.movers.length > 0 && (
                <>
                  <h2 className="text-[15px] font-bold text-text-hi mb-2.5">Najszybsze wzrosty</h2>
                  <div className="flex flex-col gap-2">
                    {data.movers.map((it, i) => (
                      <motion.div key={it.productId} {...stagger(i + 1)}>
                        <MoverRow it={it} />
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* ── desktop: szeroki baner + tabela ── */}
            <div className="hidden md:block">
              <motion.div {...stagger(0)} className="mb-7">
                <DayPickWide it={td} />
              </motion.div>
              {data.movers.length > 0 && (
                <>
                  <h2 className="text-[16px] font-bold text-text-hi mb-3">Najszybsze wzrosty</h2>
                  <MoverTable items={data.movers} />
                </>
              )}
            </div>

            {/* track-record placeholder */}
            <div className="mt-6 rounded-xl border border-line bg-bg-surface px-4 py-3 text-[12px] text-text-mid font-mono">
              Typów sprzed 14 dni wciąż rośnie: <span className="text-text-lo">— (zbieram historię)</span>
            </div>

            {/* stopka zaufania */}
            <p className="mt-5 text-[11px] text-text-lo leading-relaxed text-center max-w-md mx-auto">
              Każdy typ ma powód. Pokazujemy realne sztuki i rank. Nie zgadujemy przychodów.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ── reason chips ─────────────────────────────────────────────────────────────
function RankChip({ it }: { it: PropozycjaItem }) {
  if (it.rankDelta == null || it.rankDelta <= 0 || it.rank == null) return null
  return (
    <Chip color="profit">▲ <span className="font-mono">#{it.rank + it.rankDelta}→#{it.rank}</span> w 24h</Chip>
  )
}
function DoubleChip({ it }: { it: PropozycjaItem }) {
  if (!it.isDouble) return null
  return <Chip color="blue">⌖ <span className="font-mono">{it.adCount}</span> reklam FB</Chip>
}
function FreshChip({ it }: { it: PropozycjaItem }) {
  if (!it.isFresh) return null
  return <Chip color="heat">✦ śledzony <span className="font-mono">{it.daysTracked}</span> dni</Chip>
}
function VelocityChip({ it }: { it: PropozycjaItem }) {
  // gdy brak rank-delta (early stage) — pokaż realne sztuki/24h
  if (it.rankDelta != null && it.rankDelta > 0) return null
  if (it.sold24h == null || it.sold24h <= 0) return null
  return <Chip color="profit">▲ <span className="font-mono">{fmt(it.sold24h)}</span> szt./24h</Chip>
}

const CHIP_CLS: Record<string, string> = {
  profit: 'bg-profit/12 text-profit',
  blue: 'bg-blue/12 text-blue',
  heat: 'bg-heat/12 text-heat',
}
function Chip({ color, children }: { color: 'profit' | 'blue' | 'heat'; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md ${CHIP_CLS[color]}`}>{children}</span>
}

// ── typ dnia ─────────────────────────────────────────────────────────────────
function DayPick({ it }: { it: PropozycjaItem }) {
  const units = dailyUnits(it)
  return (
    <div className="rounded-2xl p-[1.5px] bg-gradient-to-br from-profit/60 via-blue/40 to-heat/50">
      <div className="rounded-[15px] bg-bg-surface p-4">
        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide text-profit bg-profit/12 px-2 py-1 rounded-md">
          ★ Wysoki sygnał · typ dnia
        </span>
        <div className="flex gap-3.5 mt-3">
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-bg-raised shrink-0 flex items-center justify-center text-3xl">
            {it.imageUrl ? <img src={it.imageUrl} alt="" className="w-full h-full object-cover" /> : '🛒'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-text-hi leading-snug line-clamp-2">{it.title}</p>
            <p className="text-[12px] mt-1.5 flex items-center gap-2 flex-wrap font-mono text-text-mid">
              {it.price != null && <span className="text-text-hi font-bold">${it.price}</span>}
              {it.rating != null && <span className="text-heat">★ {it.rating}</span>}
              {it.reviewCount != null && <span className="text-text-lo">{fmt(it.reviewCount)} opinii</span>}
            </p>
            <p className="text-[12px] mt-1 font-mono">
              <span className="text-profit font-bold">{fmt(it.salesVolume)}</span>
              <span className="text-text-lo"> sprzedanych łącznie</span>
            </p>
          </div>
        </div>

        {/* reason chips — sygnatura */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <RankChip it={it} /><VelocityChip it={it} /><DoubleChip it={it} /><FreshChip it={it} />
        </div>

        {/* sparkline dziennych sztuk */}
        {units.length >= 2 ? (
          <div className="mt-3 flex items-center gap-2">
            <Sparkline data={units} w={120} h={28} />
            <span className="text-[10.5px] text-text-lo font-mono">dzienne sztuki</span>
          </div>
        ) : (
          <p className="mt-3 text-[11px] text-text-lo italic">zbieram od dziś — wykres pojawi się przy ≥2 dniach</p>
        )}

        <Link href={`/shop/${it.productId}`} className="mt-4 flex items-center justify-center gap-1.5 bg-profit/15 text-profit text-[13px] font-semibold py-2.5 rounded-xl hover:bg-profit/25 transition-colors">
          Zobacz szczegóły <ChevronRight size={15} />
        </Link>
      </div>
    </div>
  )
}

// ── wiersz movera ──────────────────────────────────────────────────────────
function MoverRow({ it }: { it: PropozycjaItem }) {
  return (
    <Link href={`/shop/${it.productId}`} className="flex items-center gap-3 bg-bg-surface border border-line rounded-[13px] px-3 py-2.5 hover:border-text-mid transition-colors">
      <span className="w-12 h-12 rounded-[9px] shrink-0 overflow-hidden flex items-center justify-center text-xl bg-bg-raised">
        {it.imageUrl ? <img src={it.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" /> : '🛒'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-text-hi truncate">{it.title}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <RankChip it={it} /><VelocityChip it={it} /><DoubleChip it={it} />
        </div>
      </div>
      <div className="text-right shrink-0">
        {it.sold7d != null ? (
          <>
            <div className="text-[13px] font-bold text-profit font-mono">{fmt(it.sold7d)}</div>
            <div className="text-[10px] text-text-lo">sprzedane / 7 dni</div>
          </>
        ) : (
          <>
            <div className="text-[13px] font-bold text-text-lo font-mono">—</div>
            <div className="text-[10px] text-text-lo">zbieram od dziś</div>
          </>
        )}
      </div>
    </Link>
  )
}

// ── desktop: szeroki baner typu dnia ────────────────────────────────────────
function DayPickWide({ it }: { it: PropozycjaItem }) {
  const units = dailyUnits(it)
  return (
    <div className="rounded-2xl p-[1.5px] bg-gradient-to-r from-profit/60 via-blue/40 to-heat/50">
      <div className="rounded-[15px] bg-bg-surface p-5 flex gap-5 items-center">
        <div className="w-28 h-28 rounded-xl overflow-hidden bg-bg-raised shrink-0 flex items-center justify-center text-4xl">
          {it.imageUrl ? <img src={it.imageUrl} alt="" className="w-full h-full object-cover" /> : '🛒'}
        </div>
        <div className="flex-1 min-w-0">
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wide text-profit bg-profit/12 px-2 py-1 rounded-md mb-2">
            ★ Wysoki sygnał · typ dnia
          </span>
          <p className="text-[16px] font-semibold text-text-hi leading-snug line-clamp-2">{it.title}</p>
          <p className="text-[13px] mt-1.5 flex items-center gap-3 flex-wrap font-mono text-text-mid">
            {it.price != null && <span className="text-text-hi font-bold">${it.price}</span>}
            {it.rating != null && <span className="text-heat">★ {it.rating}</span>}
            {it.reviewCount != null && <span className="text-text-lo">{fmt(it.reviewCount)} opinii</span>}
            <span><span className="text-profit font-bold">{fmt(it.salesVolume)}</span><span className="text-text-lo"> sprzedanych</span></span>
          </p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            <RankChip it={it} /><VelocityChip it={it} /><DoubleChip it={it} /><FreshChip it={it} />
          </div>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-3 w-44">
          {units.length >= 2 ? (
            <div className="flex flex-col items-end gap-1">
              <Sparkline data={units} w={170} h={40} />
              <span className="text-[10.5px] text-text-lo font-mono">dzienne sztuki</span>
            </div>
          ) : (
            <p className="text-[11px] text-text-lo italic text-right">zbieram od dziś — wykres przy ≥2 dniach</p>
          )}
          <Link href={`/shop/${it.productId}`} className="w-full flex items-center justify-center gap-1.5 bg-profit/15 text-profit text-[13px] font-semibold py-2.5 rounded-xl hover:bg-profit/25 transition-colors">
            Zobacz szczegóły <ChevronRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── desktop: tabela najszybszych wzrostów ────────────────────────────────────
function MoverTable({ items }: { items: PropozycjaItem[] }) {
  return (
    <div className="rounded-2xl border border-line overflow-hidden">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-bg-surface text-[11px] uppercase tracking-wide text-text-lo">
            <th className="font-semibold px-4 py-3 w-8">#</th>
            <th className="font-semibold px-4 py-3">Produkt</th>
            <th className="font-semibold px-4 py-3">Sygnał</th>
            <th className="font-semibold px-4 py-3 text-right whitespace-nowrap">Sprzedane łącznie</th>
            <th className="font-semibold px-4 py-3 text-right whitespace-nowrap">Sprzedane / 7 dni</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={it.productId}
              onClick={() => { window.location.href = `/shop/${it.productId}` }}
              className="border-t border-line bg-bg-void hover:bg-bg-surface transition-colors cursor-pointer">
              <td className="px-4 py-3 text-sm font-extrabold text-text-lo font-mono">{i + 1}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-10 h-10 rounded-[9px] shrink-0 overflow-hidden flex items-center justify-center text-lg bg-bg-raised">
                    {it.imageUrl ? <img src={it.imageUrl} alt="" loading="lazy" className="w-full h-full object-cover" /> : '🛒'}
                  </span>
                  <span className="min-w-0 max-w-[360px]">
                    <span className="block text-[13px] font-semibold text-text-hi truncate">{it.title}</span>
                    {it.price != null && <span className="block text-[11px] text-text-lo font-mono">${it.price}</span>}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <RankChip it={it} /><VelocityChip it={it} /><DoubleChip it={it} /><FreshChip it={it} />
                </div>
              </td>
              <td className="px-4 py-3 text-right text-[13px] text-text-hi font-mono whitespace-nowrap">{fmt(it.salesVolume)}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap">
                {it.sold7d != null
                  ? <span className="text-[13px] font-bold text-profit font-mono">{fmt(it.sold7d)}</span>
                  : <span className="text-[11px] text-text-lo italic">zbieram od dziś</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── sparkline (dzienne sztuki, mint) ─────────────────────────────────────────
function Sparkline({ data, w, h }: { data: number[]; w: number; h: number }) {
  const min = Math.min(...data), max = Math.max(...data)
  const span = max - min || 1
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / span) * h}`).join(' ')
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden>
      <polyline points={pts} fill="none" stroke="var(--color-profit)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
