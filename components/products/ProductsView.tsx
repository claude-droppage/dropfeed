'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ProductWinner } from '@/lib/types'
import { SwipeSpyLogo } from '@/components/SwipeSpyLogo'
import { getProductWinnersForDate } from '@/lib/data/source'
import WinnerCard from './WinnerCard'

const WD = ['ndz', 'pon', 'wt', 'śr', 'czw', 'pt', 'sob']

export default function ProductsView({
  realTodayISO, days, todayWinners, tail,
}: {
  realTodayISO: string
  days: { day: string; thumb?: string }[]
  todayWinners: ProductWinner[]
  tail: ProductWinner[]
}) {
  const router = useRouter()
  const open = (id: string) => router.push(`/products/${id}`)
  // mapa dzień → miniatura (Minea-style kafelki); obecność = ma snapshot
  const thumbByDay = useMemo(() => new Map(days.map((d) => [d.day, d.thumb])), [days])

  // okno [dziś + 6 wstecz] = 7 dni, kotwica = realne dziś (UTC, bez dryfu strefy). ZERO przyszłości.
  const last7 = useMemo(() => {
    const base = new Date(realTodayISO + 'T00:00:00Z')
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base); d.setUTCDate(base.getUTCDate() - i)
      return d.toISOString().slice(0, 10)
    })
  }, [realTodayISO])

  // domyślnie DZIŚ (realna data), nawet jeśli pusty (uczciwy stan) — nigdy nie cofamy na wczoraj
  const [day, setDay] = useState(realTodayISO)
  const [cache, setCache] = useState<Record<string, ProductWinner[]>>({ [realTodayISO]: todayWinners })
  const [loading, setLoading] = useState(false)

  const selectDay = async (d: string) => {
    setDay(d)
    if (cache[d] !== undefined || !thumbByDay.has(d)) return
    setLoading(true)
    const w = await getProductWinnersForDate(d)
    setCache((c) => ({ ...c, [d]: w }))
    setLoading(false)
  }

  const winners = cache[day] ?? []
  const label = (d: string) => WD[new Date(d + 'T00:00:00Z').getUTCDay()].toUpperCase()
  const dayNum = (d: string) => new Date(d + 'T00:00:00Z').getUTCDate()
  const isToday = (d: string) => d === realTodayISO

  return (
    <div className="h-full overflow-y-auto bg-bg-void">
      <div className="mx-auto max-w-xl md:max-w-6xl px-4 md:px-8 pt-4 pb-12">
        <div className="flex items-center justify-between mb-1 md:hidden">
          <SwipeSpyLogo className="text-[1.15rem]" />
        </div>
        <h1 className="text-lg md:text-[22px] font-bold tracking-tight text-text-hi">Top 10 na dziś</h1>
        <p className="text-[12px] text-text-mid mt-0.5 mb-4">Codzienni zwycięzcy z reklam — nowe i rosnące, z walidacją (ilu reklamuje). Realne liczby, nigdy $.</p>

        {/* kalendarz 7 dni [dziś + 6 wstecz] — Minea: miniatura top-zwycięzcy + skrót dnia + numer */}
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-4 px-4 md:mx-0 md:px-0">
          {last7.map((d) => {
            const active = d === day
            const thumb = thumbByDay.get(d)
            const hasSnap = thumbByDay.has(d)
            const today = isToday(d)
            return (
              <button key={d} type="button" onClick={() => selectDay(d)}
                className={`shrink-0 w-[62px] rounded-xl border overflow-hidden text-center transition-all ${
                  active ? 'border-heat ring-2 ring-heat/40' : today ? 'border-heat/50' : 'border-line hover:border-text-mid'} ${hasSnap || today ? '' : 'opacity-50'}`}>
                <div className="relative h-[62px] bg-bg-raised flex items-center justify-center">
                  {thumb ? <img src={thumb} alt="" loading="lazy" className="w-full h-full object-cover" /> : <span className="text-text-lo text-base">{today ? '⏳' : '🗓️'}</span>}
                </div>
                <div className={`py-1 ${active ? 'bg-heat/15' : 'bg-bg-surface'}`}>
                  <div className={`text-[10px] font-semibold ${active || today ? 'text-heat' : 'text-text-mid'}`}>{label(d)}</div>
                  <div className={`text-[13px] font-bold font-mono leading-none ${active ? 'text-heat' : 'text-text-hi'}`}>{dayNum(d)}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* zwycięzcy wybranego dnia */}
        {loading ? (
          <div className="py-10 text-center text-text-lo text-sm">ładuję…</div>
        ) : winners.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-5 py-8 text-center mb-8">
            <div className="text-2xl mb-1.5">{isToday(day) ? '⏳' : '🗓️'}</div>
            <p className="text-sm font-semibold text-text-hi mb-1">{isToday(day) ? 'Zbieram dzisiejszych zwycięzców' : thumbByDay.has(day) ? 'Brak zwycięzców tego dnia' : 'Brak snapshotu — historia narasta'}</p>
            <p className="text-[12px] text-text-lo">{isToday(day) ? 'Snapshot w toku — pojawią się po dzisiejszym przeliczeniu. Zobacz wcześniejsze dni.' : 'Zwycięzcy liczeni raz dziennie po scrape. Historia narasta.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
            {winners.map((w) => <WinnerCard key={w.productId} w={w} onOpen={() => open(w.productId)} />)}
          </div>
        )}

        {/* pełna lista rise-first */}
        {tail.length > 0 && (
          <>
            <h2 className="text-base font-bold text-text-hi mb-3">Wszystkie produkty <span className="text-text-lo text-xs font-normal">· rosnące najpierw</span></h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {tail.map((w) => <WinnerCard key={w.productId} w={w} onOpen={() => open(w.productId)} />)}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
