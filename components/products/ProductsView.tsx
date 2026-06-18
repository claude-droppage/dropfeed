'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ProductWinner } from '@/lib/types'
import { SwipeSpyLogo } from '@/components/SwipeSpyLogo'
import { getProductWinnersForDate } from '@/lib/data/source'
import WinnerCard from './WinnerCard'

const WD = ['niedz', 'pon', 'wt', 'śr', 'czw', 'pt', 'sob']

export default function ProductsView({
  todayISO, daysWithData, todayWinners, tail,
}: {
  todayISO: string
  daysWithData: string[]
  todayWinners: ProductWinner[]
  tail: ProductWinner[]
}) {
  const router = useRouter()
  const open = (id: string) => router.push(`/products/${id}`)
  const hasData = useMemo(() => new Set(daysWithData), [daysWithData])

  // ostatnie 7 dni kalendarzowych (od dziś wstecz) — dni bez snapshotu = pusty stan
  const last7 = useMemo(() => {
    const base = new Date(todayISO + 'T00:00:00')
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base); d.setDate(base.getDate() - i)
      return d.toISOString().slice(0, 10)
    })
  }, [todayISO])

  const [day, setDay] = useState(todayISO)
  const [cache, setCache] = useState<Record<string, ProductWinner[]>>({ [todayISO]: todayWinners })
  const [loading, setLoading] = useState(false)

  const selectDay = async (d: string) => {
    setDay(d)
    if (cache[d] || !hasData.has(d)) return
    setLoading(true)
    const w = await getProductWinnersForDate(d)
    setCache((c) => ({ ...c, [d]: w }))
    setLoading(false)
  }

  const winners = cache[day] ?? []
  const label = (d: string) => {
    if (d === todayISO) return 'Dziś'
    return WD[new Date(d + 'T00:00:00').getDay()]
  }
  const dayNum = (d: string) => new Date(d + 'T00:00:00').getDate()

  return (
    <div className="h-full overflow-y-auto bg-bg-void">
      <div className="mx-auto max-w-xl md:max-w-6xl px-4 md:px-8 pt-4 pb-12">
        <div className="flex items-center justify-between mb-1 md:hidden">
          <SwipeSpyLogo className="text-[1.15rem]" />
        </div>
        <h1 className="text-lg md:text-[22px] font-bold tracking-tight text-text-hi">Produkty</h1>
        <p className="text-[12px] text-text-mid mt-0.5 mb-4">Zwycięzcy z reklam — nowe i rosnące, z walidacją (ilu reklamuje). Realne liczby, nigdy $.</p>

        {/* kalendarz 7 dni */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 -mx-4 px-4 md:mx-0 md:px-0">
          {last7.map((d) => {
            const active = d === day
            const dis = !hasData.has(d)
            return (
              <button key={d} type="button" onClick={() => selectDay(d)}
                className={`shrink-0 w-14 py-2 rounded-xl border text-center transition-colors ${
                  active ? 'bg-heat/15 border-heat/40 text-heat'
                  : dis ? 'bg-transparent border-line text-text-lo'
                  : 'bg-bg-surface border-line text-text-mid hover:text-text-hi'}`}>
                <div className="text-[11px] font-semibold">{label(d)}</div>
                <div className="text-[15px] font-bold font-mono leading-tight">{dayNum(d)}</div>
              </button>
            )
          })}
        </div>

        {/* zwycięzcy wybranego dnia */}
        {loading ? (
          <div className="py-10 text-center text-text-lo text-sm">ładuję…</div>
        ) : winners.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-5 py-8 text-center mb-8">
            <div className="text-2xl mb-1.5">🗓️</div>
            <p className="text-sm font-semibold text-text-hi mb-1">{hasData.has(day) ? 'Brak zwycięzców tego dnia' : 'Brak snapshotu z tego dnia'}</p>
            <p className="text-[12px] text-text-lo">Zwycięzcy są liczeni raz dziennie po scrape. Historia narasta — wróć jutro.</p>
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
