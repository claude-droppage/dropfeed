'use client'

import { useEffect, useState } from 'react'
import { X, Store, ExternalLink, Bookmark, Play, Heart, Eye, Sparkles, BadgeCheck, Mail, MessageSquare, Target } from 'lucide-react'

export interface SRProduct {
  productId: string; title: string; imageUrl?: string; price: number; currency: string
  rating?: number; soldCount: number; estRevenue: number; shopName?: string; productUrl?: string; region: string
}
interface Video { itemId: string; url?: string; cover?: string; views: number; likes: number; postedAt?: string; caption: string; authorName: string; authorUrl?: string; authorAvatar?: string }
interface Creator { handle: string; nickname: string; followers: number; likes: number; videoCount: number; verified: boolean; avatar?: string; bio?: string; bioLink?: string; email?: string }
interface Teardown { hook?: string; format?: string; language?: string; proof?: string; angle?: string; funnel?: string; why?: string }
interface RAnalysis { summary?: string; complaints?: { point: string; quote: string }[]; loves?: { point: string; quote: string }[]; whyBuy?: string[]; questions?: string[]; voc?: string[]; angles?: string[] }
interface RData { analysis: RAnalysis; total: number; overall: number; sampled: number; verifiedPct: number; usPct: number; breakdown: { stars: number; n: number }[] }

const fmt = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n)
const fmtMoney = (n: number, c: string) => `${c}${n.toLocaleString('pl-PL', { maximumFractionDigits: 0 })}`

export default function ProductModal({ product: p, onClose, onSave, isSaved }: { product: SRProduct; onClose: () => void; onSave: (p: SRProduct) => void; isSaved: boolean }) {
  const [videos, setVideos] = useState<Video[] | null>(null)
  const [sort, setSort] = useState<'views' | 'likes' | 'new' | 'old'>('views')
  const [openVid, setOpenVid] = useState<string | null>(null)
  const [creators, setCreators] = useState<Record<string, Creator | null>>({})
  const [showCreator, setShowCreator] = useState<string | null>(null)
  const [teardowns, setTeardowns] = useState<Record<string, Teardown | 'loading' | 'error'>>({})
  const [reviews, setReviews] = useState<'idle' | 'loading' | 'error' | 'none' | RData>('idle')

  const analyzeReviews = async () => {
    setReviews('loading')
    try {
      const r = await fetch('/api/shopradar/reviews', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId: p.productId, region: p.region }) })
      if (!r.ok) { setReviews(r.status === 404 ? 'none' : 'error'); return }
      setReviews(await r.json())
    } catch { setReviews('error') }
  }

  useEffect(() => {
    let on = true
    fetch(`/api/shopradar/videos?productId=${p.productId}&region=${p.region}&url=${encodeURIComponent(p.productUrl ?? '')}`)
      .then((r) => r.json()).then((d) => { if (on) setVideos(d.videos ?? []) }).catch(() => on && setVideos([]))
    return () => { on = false }
  }, [p.productId, p.region, p.productUrl])

  const sorted = (videos ?? []).slice().sort((a, b) =>
    sort === 'views' ? b.views - a.views : sort === 'likes' ? b.likes - a.likes
      : (Date.parse(b.postedAt ?? '0') - Date.parse(a.postedAt ?? '0')) * (sort === 'new' ? 1 : -1))

  const loadCreator = async (handle: string) => {
    setShowCreator(handle)
    if (creators[handle] !== undefined) return
    const r = await fetch(`/api/shopradar/creator?handle=${encodeURIComponent(handle)}`).then((x) => x.json()).catch(() => ({}))
    setCreators((c) => ({ ...c, [handle]: r.creator ?? null }))
  }

  const teardown = async (v: Video) => {
    setTeardowns((t) => ({ ...t, [v.itemId]: 'loading' }))
    try {
      const r = await fetch('/api/shopradar/teardown', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productId: p.productId, region: p.region, itemId: v.itemId, cover: v.cover, caption: v.caption, views: v.views, likes: v.likes }) }).then((x) => x.json())
      setTeardowns((t) => ({ ...t, [v.itemId]: r.teardown ?? 'error' }))
    } catch { setTeardowns((t) => ({ ...t, [v.itemId]: 'error' })) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-bg-void/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6" onClick={onClose}>
      <div className="bg-bg-surface border border-line rounded-t-3xl md:rounded-3xl w-full max-w-lg max-h-[92dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          {p.imageUrl && <img src={p.imageUrl} alt="" className="w-full aspect-square object-cover" />}
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-bg-void/70 backdrop-blur grid place-items-center text-text-hi"><X size={16} /></button>
        </div>
        <div className="p-5">
          <h2 className="text-text-hi font-semibold text-[15px] leading-snug">{p.title}</h2>
          <div className="text-[12px] text-text-mid mt-1 flex items-center gap-1"><Store size={12} /> {p.shopName}</div>
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            {[['Cena', `${p.currency}${p.price}`], ['Sprzedane', `${p.soldCount.toLocaleString('pl-PL')} szt`], ['Szac. przychód', fmtMoney(p.estRevenue, p.currency)], ['Ocena', p.rating ? `★ ${p.rating}` : '—']].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-bg-raised px-3 py-2.5"><div className="font-mono text-[15px] text-text-hi">{v}</div><div className="text-[11px] text-text-lo">{k}</div></div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            {p.productUrl && <a href={p.productUrl} target="_blank" rel="noopener noreferrer" className="flex-1 bg-heat text-bg-void rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-1.5"><ExternalLink size={14} /> TikTok Shop</a>}
            <button onClick={() => onSave(p)} className={`px-4 rounded-xl border text-sm flex items-center gap-1.5 ${isSaved ? 'border-profit text-profit' : 'border-line text-text-mid'}`}>
              <Bookmark size={14} className={isSaved ? 'fill-current' : ''} /> {isSaved ? 'Zapisano' : 'Zapisz'}
            </button>
          </div>

          {/* WIDEO napędzające sprzedaż */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-text-hi text-sm font-semibold">Wideo napędzające sprzedaż {videos && <span className="text-text-lo font-normal">· {videos.length}</span>}</h3>
              {videos && videos.length > 0 && (
                <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="bg-bg-raised border border-line rounded-lg px-2 py-1 text-[11px] text-text-mid">
                  <option value="views">Najwięcej wyśw.</option><option value="likes">Najwięcej lajków</option><option value="new">Najnowsze</option><option value="old">Najstarsze</option>
                </select>
              )}
            </div>
            {videos === null ? (
              <div className="grid grid-cols-3 gap-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-lg bg-bg-raised animate-pulse" />)}</div>
            ) : videos.length === 0 ? (
              <p className="text-[12px] text-text-lo">Brak powiązanych wideo.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {sorted.slice(0, 12).map((v) => (
                  <div key={v.itemId}>
                    {openVid === v.itemId ? (
                      <div className="aspect-[3/4] rounded-lg overflow-hidden bg-black">
                        <iframe src={`https://www.tiktok.com/player/v1/${v.itemId}?autoplay=1&music_info=0&description=0`} className="w-full h-full" frameBorder={0} allow="autoplay; fullscreen; encrypted-media" title={v.itemId} />
                      </div>
                    ) : (
                      <button onClick={() => setOpenVid(v.itemId)} className="relative aspect-[3/4] rounded-lg overflow-hidden bg-bg-raised w-full group">
                        {v.cover && <img src={v.cover} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        <div className="absolute inset-0 grid place-items-center"><Play size={20} className="text-white fill-current" /></div>
                        <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between font-mono text-[9px] text-white">
                          <span className="flex items-center gap-0.5"><Eye size={9} />{fmt(v.views)}</span>
                          <span className="flex items-center gap-0.5"><Heart size={9} />{fmt(v.likes)}</span>
                        </div>
                      </button>
                    )}
                    <div className="mt-1 flex items-center gap-1">
                      <button onClick={() => v.authorName && loadCreator(v.authorName)} className="text-[10px] text-text-mid truncate hover:text-text-hi flex-1 text-left">@{v.authorName}</button>
                      <button onClick={() => teardown(v)} title="AI teardown" className="text-heat shrink-0"><Sparkles size={12} /></button>
                    </div>
                    {teardowns[v.itemId] && (
                      <div className="mt-1 rounded-lg bg-bg-raised border border-line p-2 text-[10px] leading-snug">
                        {teardowns[v.itemId] === 'loading' ? <span className="text-text-lo">analizuję…</span>
                          : teardowns[v.itemId] === 'error' ? <span className="text-text-lo">błąd AI</span>
                          : (() => { const t = teardowns[v.itemId] as Teardown; return (
                            <div className="space-y-1 text-text-mid">
                              {t.hook && <div><span className="text-heat">Hook:</span> {t.hook}</div>}
                              {t.angle && <div><span className="text-heat">Kąt:</span> {t.angle}</div>}
                              {t.funnel && <div><span className="text-heat">Funnel:</span> {t.funnel}</div>}
                              {t.why && <div className="text-text-lo">{t.why}</div>}
                            </div>) })()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* brief: skopiuj ID do generatora w „Marki i briefy" */}
          <div className="mt-3 flex items-center gap-2 text-[11px] text-text-lo">
            <button onClick={() => navigator.clipboard?.writeText(p.productId)} className="rounded-md bg-bg-raised border border-line px-2 py-1 hover:text-text-hi">Kopiuj ID produktu</button>
            <a href="/shopradar/brands" className="text-heat hover:underline">→ Generuj brief</a>
          </div>

          {/* RECENZJE → kąty reklamowe */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-text-hi text-sm font-semibold flex items-center gap-1.5"><MessageSquare size={14} /> Recenzje → kąty</h3>
              {reviews === 'idle' && <button onClick={analyzeReviews} className="rounded-full bg-heat-deep border border-heat/30 text-heat text-[11px] px-2.5 py-1">Analizuj recenzje</button>}
            </div>
            {reviews === 'loading' && <div className="rounded-xl bg-bg-raised p-3 text-[12px] text-text-lo">scrapuję recenzje + analizuję…</div>}
            {reviews === 'error' && <div className="text-[12px] text-text-lo">Błąd analizy. <button onClick={analyzeReviews} className="text-heat">spróbuj ponownie</button></div>}
            {reviews === 'none' && <div className="text-[12px] text-text-lo">Brak recenzji do analizy.</div>}
            {typeof reviews === 'object' && (() => { const d = reviews as RData; const max = Math.max(1, ...d.breakdown.map((x) => x.n)); return (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="text-center"><div className="font-mono text-2xl text-text-hi">{d.overall}</div><div className="text-[10px] text-text-lo">★ ({d.total.toLocaleString('pl-PL')})</div></div>
                  <div className="flex-1 space-y-0.5">
                    {d.breakdown.map((x) => <div key={x.stars} className="flex items-center gap-1.5 text-[10px]"><span className="text-text-lo w-2">{x.stars}</span><div className="flex-1 h-1.5 rounded bg-bg-raised overflow-hidden"><div className="h-full bg-heat" style={{ width: `${x.n / max * 100}%` }} /></div></div>)}
                  </div>
                  <div className="text-[10px] text-text-lo text-right leading-tight">{d.verifiedPct}% zweryf.<br />{d.usPct}% US<br />{d.sampled} próbka</div>
                </div>
                {d.analysis.summary && <p className="text-[12px] text-text-mid leading-snug">{d.analysis.summary}</p>}
                {!!d.analysis.angles?.length && <RBlock icon={<Target size={12} className="text-heat" />} title="Kąty reklamowe" items={d.analysis.angles} />}
                {!!d.analysis.loves?.length && <RQuotes title="Za co kochają" color="text-profit" items={d.analysis.loves} />}
                {!!d.analysis.complaints?.length && <RQuotes title="Obiekcje" color="text-heat" items={d.analysis.complaints} />}
                {!!d.analysis.voc?.length && <RBlock title="Voice-of-customer" items={d.analysis.voc} />}
                {!!d.analysis.whyBuy?.length && <RBlock title="Dlaczego kupują" items={d.analysis.whyBuy} />}
              </div>) })()}
          </div>
        </div>
      </div>

      {/* Profil twórcy */}
      {showCreator && (
        <div className="fixed inset-0 z-[60] bg-bg-void/80 flex items-center justify-center p-6" onClick={(e) => { e.stopPropagation(); setShowCreator(null) }}>
          <div className="bg-bg-surface border border-line rounded-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            {creators[showCreator] === undefined ? <p className="text-text-lo text-sm text-center py-6">ładuję profil…</p>
              : creators[showCreator] === null ? <p className="text-text-lo text-sm text-center py-6">Nie znaleziono profilu.</p>
              : (() => { const c = creators[showCreator] as Creator; return (
                <>
                  <div className="flex items-center gap-3">
                    {c.avatar && <img src={c.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />}
                    <div className="min-w-0">
                      <div className="text-text-hi font-semibold flex items-center gap-1">{c.nickname} {c.verified && <BadgeCheck size={14} className="text-[var(--blue)]" />}</div>
                      <a href={`https://www.tiktok.com/@${c.handle}`} target="_blank" rel="noopener noreferrer" className="text-[12px] text-text-mid hover:text-text-hi">@{c.handle}</a>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    {[['Obserw.', fmt(c.followers)], ['Lajki', fmt(c.likes)], ['Wideo', fmt(c.videoCount)]].map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-bg-raised py-2"><div className="font-mono text-text-hi text-sm">{v}</div><div className="text-[10px] text-text-lo">{k}</div></div>
                    ))}
                  </div>
                  {c.bio && <p className="text-[12px] text-text-mid mt-3 leading-snug">{c.bio}</p>}
                  {c.email && <a href={`mailto:${c.email}`} className="mt-2 inline-flex items-center gap-1 text-[12px] text-profit"><Mail size={12} /> {c.email}</a>}
                  <button onClick={() => setShowCreator(null)} className="mt-4 w-full border border-line rounded-lg py-2 text-sm text-text-mid">Zamknij</button>
                </>) })()}
          </div>
        </div>
      )}
    </div>
  )
}

function RBlock({ icon, title, items }: { icon?: React.ReactNode; title: string; items: string[] }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-text-hi flex items-center gap-1 mb-1">{icon}{title}</div>
      <ul className="space-y-0.5">{items.slice(0, 6).map((it, i) => <li key={i} className="text-[12px] text-text-mid flex gap-1.5"><span className="text-text-lo">·</span>{it}</li>)}</ul>
    </div>
  )
}

function RQuotes({ title, color, items }: { title: string; color: string; items: { point: string; quote: string }[] }) {
  return (
    <div>
      <div className={`text-[11px] font-semibold mb-1 ${color}`}>{title}</div>
      <ul className="space-y-1.5">{items.slice(0, 4).map((it, i) => (
        <li key={i} className="text-[12px]"><span className="text-text-hi">{it.point}</span>{it.quote && <span className="block text-[11px] text-text-lo italic">„{it.quote}"</span>}</li>
      ))}</ul>
    </div>
  )
}
