'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ClusterGem, ProductWinner, FeedItem } from '@/lib/types'
import { getClusterGems, getProductWinners, getFeedPage } from '@/lib/data/source'
import WinnerCard from '@/components/products/WinnerCard'

const fmt = (n?: number | null) => (n == null ? '—' : n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')} tys.` : String(Math.round(n)))
const isMp4 = (u?: string) => !!u && /\.(mp4|webm|mov)(\?|$)/i.test(u)

export default function PreviewView() {
  const router = useRouter()
  const [tab, setTab] = useState<'products' | 'feed'>('products')
  const [variant, setVariant] = useState<'old' | 'new'>('new')
  const [aggro, setAggro] = useState(0.6)

  const [oldW, setOldW] = useState<ProductWinner[]>([])
  const [gems, setGems] = useState<ClusterGem[]>([])
  const [gemMap, setGemMap] = useState<Map<number, number>>(new Map())
  const [feed, setFeed] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(false)

  // stałe (niezależne od aggro) — raz
  useEffect(() => {
    getProductWinners(12, undefined, true, false).then(setOldW)
    getFeedPage({ offset: 0, limit: 24, seed: 123 }).then((p) => setFeed(p.items))
  }, [])

  // gem-zależne od aggro — przelicz przy zmianie suwaka
  useEffect(() => {
    let alive = true
    setLoading(true)
    Promise.all([getClusterGems(aggro, 12), getClusterGems(aggro, 600)]).then(([top, all]) => {
      if (!alive) return
      setGems(top)
      setGemMap(new Map(all.map((g) => [g.clusterId, g.gemScore])))
      setLoading(false)
    })
    return () => { alive = false }
  }, [aggro])

  const feedNew = useMemo(
    () => [...feed].sort((a, b) => (gemMap.get(b.ad.clusterId ?? -1) ?? -1) - (gemMap.get(a.ad.clusterId ?? -1) ?? -1)),
    [feed, gemMap],
  )

  return (
    <div className="h-full overflow-y-auto bg-bg-void">
      <div className="mx-auto max-w-xl md:max-w-6xl px-4 md:px-8 pt-4 pb-12">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg md:text-[22px] font-bold tracking-tight text-text-hi">Podgląd perełek</h1>
          <span className="text-[10px] font-semibold text-profit bg-profit/12 px-2 py-1 rounded">READ-ONLY · live nietknięty</span>
        </div>
        <p className="text-[12px] text-text-mid mt-0.5 mb-3">Ta sama pula — porównaj STARY scoring vs NOWY gem-score. Suwak przelicza od razu.</p>

        {/* sterowanie */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <Seg options={[['products', 'Produkty'], ['feed', 'Feed reklam']]} value={tab} onChange={(v) => setTab(v as 'products' | 'feed')} />
          <Seg options={[['old', 'STARY'], ['new', 'NOWY']]} value={variant} onChange={(v) => setVariant(v as 'old' | 'new')} accent />
          <label className="flex items-center gap-2 text-[12px] text-text-mid bg-bg-surface border border-line rounded-[10px] px-3 py-1.5">
            agresywność
            <input type="range" min={0.4} max={0.8} step={0.05} value={aggro} onChange={(e) => setAggro(Number(e.target.value))} className="accent-heat w-28" />
            <span className="font-mono text-text-hi w-8">{aggro.toFixed(2)}</span>
            <span className="text-[10px] text-text-lo">{aggro <= 0.5 ? 'bezpieczniej' : aggro >= 0.7 ? 'świeżej/ryzyko' : 'środek'}</span>
          </label>
        </div>

        {loading && variant === 'new' && <div className="text-[12px] text-text-lo mb-2">przeliczam…</div>}

        {/* PRODUKTY */}
        {tab === 'products' && (
          variant === 'old' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {oldW.map((w) => <WinnerCard key={w.productId} w={w} onOpen={() => router.push(`/products/${w.productId}`)} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {gems.map((g) => <GemCard key={g.clusterId} g={g} />)}
            </div>
          )
        )}

        {/* FEED */}
        {tab === 'feed' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(variant === 'old' ? feed : feedNew).map((it, i) => (
              <FeedCard key={it.ad.id} it={it} rank={i + 1} gem={gemMap.get(it.ad.clusterId ?? -1)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Seg({ options, value, onChange, accent }: { options: [string, string][]; value: string; onChange: (v: string) => void; accent?: boolean }) {
  return (
    <div className="flex bg-bg-surface border border-line rounded-[10px] p-[3px] gap-0.5">
      {options.map(([v, label]) => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={`text-[12px] font-semibold px-3 py-1.5 rounded-[7px] transition-colors ${value === v ? (accent ? 'bg-heat text-[#0a0b0d]' : 'bg-bg-raised text-text-hi') : 'text-text-mid hover:text-text-hi'}`}>
          {label}
        </button>
      ))}
    </div>
  )
}

function GemCard({ g }: { g: ClusterGem }) {
  return (
    <div className="bg-bg-surface border border-line rounded-2xl overflow-hidden">
      <div className="relative aspect-[4/5] bg-bg-raised overflow-hidden">
        {g.repThumb ? <img src={g.repThumb} alt="" loading="lazy" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>}
        <span className="absolute top-2 right-2 text-[11px] font-bold text-profit bg-bg-void/75 backdrop-blur px-2 py-0.5 rounded font-mono">{g.gemScore.toFixed(2)}</span>
      </div>
      <div className="p-3">
        <p className="text-[13px] font-semibold text-text-hi leading-snug line-clamp-2 min-h-[2.5em]">{g.repName}</p>
        {g.repBrand && <p className="text-[11px] text-text-lo mt-0.5 truncate">{g.repBrand}</p>}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          <Chip c="blue">⌖ {g.nSellers} sprzedawców</Chip>
          {g.newAds7d > 0 && <Chip c="profit">▲ +{g.newAds7d}/7d</Chip>}
          {g.daysFirst < 7 && <Chip c="heat">✦ świeży {g.daysFirst}d</Chip>}
          {g.crossTiktok && <Chip c="blue">⌖ TikTok</Chip>}
        </div>
      </div>
    </div>
  )
}

function FeedCard({ it, rank, gem }: { it: FeedItem; rank: number; gem?: number }) {
  const v = isMp4(it.ad.creativeUrl)
  return (
    <div className="bg-bg-surface border border-line rounded-xl overflow-hidden">
      <div className="relative aspect-[3/4] bg-bg-raised overflow-hidden">
        {v ? <video src={it.ad.creativeUrl} poster={it.ad.thumbUrl} muted playsInline preload="none" className="w-full h-full object-cover" />
          : <img src={it.ad.thumbUrl ?? it.ad.creativeUrl} alt="" loading="lazy" className="w-full h-full object-cover" />}
        <span className="absolute top-1.5 left-1.5 text-[10px] font-bold text-text-hi bg-bg-void/70 px-1.5 py-0.5 rounded font-mono">#{rank}</span>
        {gem != null && <span className="absolute top-1.5 right-1.5 text-[10px] font-bold text-profit bg-bg-void/70 px-1.5 py-0.5 rounded font-mono">{gem.toFixed(2)}</span>}
      </div>
      <p className="text-[11px] text-text-hi p-2 line-clamp-2 leading-tight">{it.product?.name ?? it.brand.name}</p>
    </div>
  )
}

const CC: Record<string, string> = { profit: 'bg-profit/12 text-profit', blue: 'bg-blue/12 text-blue', heat: 'bg-heat/12 text-heat' }
function Chip({ c, children }: { c: 'profit' | 'blue' | 'heat'; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded ${CC[c]}`}>{children}</span>
}
