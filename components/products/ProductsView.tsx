'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ProductWinner, TikTokSeller } from '@/lib/types'
import { SwipeSpyLogo } from '@/components/SwipeSpyLogo'
import { getProductWinnersForDate } from '@/lib/data/source'
import WinnerCard from './WinnerCard'
import TikTokSellersView from './TikTokSellersView'

const WD = ['ndz', 'pon', 'wt', 'śr', 'czw', 'pt', 'sob']

export default function ProductsView({
  realTodayISO, days, todayWinners, sellers,
}: {
  realTodayISO: string
  days: { day: string; thumb?: string }[]
  todayWinners: ProductWinner[]
  sellers: TikTokSeller[]
}) {
  const [tab, setTab] = useState<'propozycje' | 'sellers'>('propozycje')
  const router = useRouter()
  const open = (id: string) => router.push(`/products/${id}`)
  // mapa dzień → miniatura (Minea-style kafelki); obecność = ma snapshot
  const thumbByDay = useMemo(() => new Map(days.map((d) => [d.day, d.thumb])), [days])

  // oś czasu CHRONOLOGICZNIE (rosnąco): starsze z lewej, dziś w naturalnym miejscu, przyszłe z prawej.
  // Liczone w UTC (bez dryfu strefy). Zakres [dziś-9 .. dziś+3], przewijalny strzałkami ‹ ›.
  const timeline = useMemo(() => {
    const base = new Date(realTodayISO + 'T00:00:00Z')
    return Array.from({ length: 13 }, (_, i) => {
      const d = new Date(base); d.setUTCDate(base.getUTCDate() - 9 + i)
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

  // przewijanie osi: › = w prawo = późniejsze daty; ‹ = wstecz. Na starcie dziś w widoku.
  const scroller = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLButtonElement>(null)
  useEffect(() => { todayRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' }) }, [])
  const scrollBy = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * 240, behavior: 'smooth' })

  return (
    <div className="h-full overflow-y-auto bg-bg-void">
      <div className="mx-auto max-w-xl md:max-w-6xl px-4 md:px-8 pt-4 pb-12">
        <div className="flex items-center justify-between mb-1 md:hidden">
          <SwipeSpyLogo className="text-[1.15rem]" />
        </div>

        {/* zakładki */}
        <div className="flex gap-2 mb-4 mt-1">
          {([['propozycje', 'Dzisiejsze propozycje'], ['sellers', 'Sprzedawcy TikTok']] as const).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setTab(k)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                tab === k ? 'bg-heat text-bg-void' : 'bg-bg-surface border border-line text-text-mid hover:text-text-hi'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'sellers' ? (
          <>
            <h1 className="text-lg md:text-[22px] font-bold tracking-tight text-text-hi">Sprzedawcy TikTok</h1>
            <p className="text-[12px] text-text-mid mt-0.5 mb-4">Organiczni sprzedawcy ze zweryfikowanym sklepem Shopify.</p>
            <TikTokSellersView sellers={sellers} />
          </>
        ) : (
        <>
        <h1 className="text-lg md:text-[22px] font-bold tracking-tight text-text-hi">Top 10 na dziś</h1>
        <p className="text-[12px] text-text-mid mt-0.5 mb-4">Codzienni zwycięzcy z reklam — nowe i rosnące, z walidacją (ilu reklamuje). Realne liczby, nigdy $.</p>

        {/* kalendarz — chronologicznie L→P (starsze lewo, przyszłe prawo), strzałki przewijają oś */}
        <div className="relative mb-5">
          <button type="button" onClick={() => scrollBy(-1)} aria-label="Wstecz"
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-bg-surface border border-line items-center justify-center text-text-mid hover:text-text-hi">
            <ChevronLeft size={16} />
          </button>
          <div ref={scroller} className="flex gap-2 overflow-x-auto pb-1 md:px-10 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {timeline.map((d) => {
              const active = d === day
              const thumb = thumbByDay.get(d)
              const today = isToday(d)
              const future = d > realTodayISO
              const hasData = !!thumb
              const clickable = hasData || today
              return (
                <button key={d} ref={today ? todayRef : undefined} type="button" disabled={!clickable}
                  onClick={() => clickable && selectDay(d)}
                  className={`group shrink-0 w-[84px] h-[112px] rounded-2xl overflow-hidden relative text-left transition-all ${
                    active ? 'ring-2 ring-heat' : today ? 'ring-2 ring-heat/60' : ''} ${clickable ? 'cursor-pointer' : 'cursor-default'}`}>
                  {hasData ? (
                    <>
                      <img src={thumb} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                    </>
                  ) : (
                    <div className={`absolute inset-0 flex items-center justify-center ${today ? 'bg-heat/10' : 'bg-bg-surface'} ${future ? 'opacity-50' : 'opacity-60'}`}>
                      <span className={`text-[26px] font-bold font-mono ${today ? 'text-heat' : 'text-text-lo'}`}>{dayNum(d)}</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 px-2 py-1.5">
                    <div className={`text-[10px] font-bold tracking-wide ${today ? 'text-heat' : hasData ? 'text-white/90' : 'text-text-lo'}`}>{today ? 'DZIŚ' : label(d)}</div>
                    {hasData && <div className="text-[15px] font-bold font-mono text-white leading-none">{dayNum(d)}</div>}
                  </div>
                </button>
              )
            })}
          </div>
          <button type="button" onClick={() => scrollBy(1)} aria-label="Do przodu"
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-bg-surface border border-line items-center justify-center text-text-mid hover:text-text-hi">
            <ChevronRight size={16} />
          </button>
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
        </>
        )}
      </div>
    </div>
  )
}
