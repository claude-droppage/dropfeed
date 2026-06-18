'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getTikTokShopProduct } from '@/lib/data/source'
import type { TikTokShopProductView } from '@/lib/types'

const fmt = (n?: number) => (n == null ? '—' : n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')} tys.` : String(n))

export default function ShopDeepDive({ initial, productId }: { initial: TikTokShopProductView; productId: string }) {
  const [view, setView] = useState<TikTokShopProductView>(initial)
  const [loading, setLoading] = useState(false)

  // on-demand enrich, gdy cache wideo wygasł/pusty (~2 tyg). Apify żyje w Edge Function.
  useEffect(() => {
    if (!initial.videosStale) return
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const supabase = createClient()
        await supabase.functions.invoke('shop-enrich', { body: { productId } })
        const fresh = await getTikTokShopProduct(productId)
        if (alive && fresh) setView(fresh)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [initial.videosStale, productId])

  const d = view.detail
  const sold = d.exactSold ?? d.salesVolume

  return (
    <div className="h-full overflow-y-auto bg-bg-void">
      <div className="mx-auto max-w-2xl px-5 pt-4 pb-12">
        <Link href="/shop" className="inline-flex items-center gap-1.5 text-text-mid text-sm mb-4 hover:text-text-hi transition-colors">
          <ArrowLeft size={16} /> TikTok Shop
        </Link>

        {/* nagłówek — twardy rdzeń */}
        <div className="flex gap-4">
          <div className="w-28 h-28 rounded-2xl overflow-hidden bg-bg-raised shrink-0 flex items-center justify-center text-4xl">
            {d.thumbUrl ? <img src={d.thumbUrl} alt="" className="w-full h-full object-cover" /> : '🛒'}
          </div>
          <div className="min-w-0">
            <h1 className="text-text-hi text-lg font-bold leading-snug line-clamp-3">{d.title}</h1>
            {d.price && <p className="text-text-hi font-bold mt-1.5">{d.price}</p>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-5">
          <Stat v={fmt(sold)} k="sprzedanych" accent />
          <Stat v={d.soldLast30 != null ? fmt(d.soldLast30) : '—'} k="ost. 30 dni" />
          <Stat v={d.rating != null ? `★ ${d.rating}` : '—'} k={d.reviewCount != null ? `${fmt(d.reviewCount)} opinii` : 'ocena'} />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <Stat v={d.shopName ?? '—'} k="sklep" />
          <Stat v={d.shopFollowers != null ? fmt(d.shopFollowers) : '—'} k="obserw. sklepu" />
          <Stat v={d.shopVideoCount != null ? fmt(d.shopVideoCount) : '—'} k="wideo sklepu" />
        </div>

        {/* Profil sprzedawcy na TikToku (globalnie dostępny) — sklep TikTok Shop jest
            zablokowany regionem US, więc z PL i tak by się nie otworzył. */}
        {d.shopName && (
          <a href={`https://www.tiktok.com/search?q=${encodeURIComponent(d.shopName)}`} target="_blank" rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 bg-profit/15 text-profit text-sm font-semibold py-2.5 rounded-xl hover:bg-profit/25 transition-colors">
            Otwórz profil na TikToku <ExternalLink size={15} />
          </a>
        )}

        {/* powiązane wideo — UCZCIWA etykieta */}
        <div className="mt-8">
          <h2 className="text-text-hi text-[15px] font-bold">Powiązane wideo (wyszukane)</h2>
          <p className="text-text-lo text-[11px] mt-0.5 mb-3">Dopasowane po nazwie produktu — nie precyzyjne linkowanie.</p>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-10 text-text-lo text-sm">
              <span className="w-5 h-5 rounded-full border-2 border-line border-t-heat animate-spin" />
              szukam wideo…
            </div>
          ) : view.videos.length === 0 ? (
            <p className="text-text-lo text-sm py-6 text-center">Brak trafnych wideo.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {view.videos.slice(0, 4).map((v) => (
                  <div key={v.videoId}>
                    <iframe
                      src={`https://www.tiktok.com/embed/v2/${v.videoId}`}
                      className="w-full rounded-xl border border-line bg-bg-surface"
                      style={{ height: 560 }}
                      allow="encrypted-media"
                      title={v.caption || v.videoId}
                    />
                    <p className="text-[11px] text-text-mid mt-1.5">
                      ▶ {fmt(v.views)} · ❤ {fmt(v.likes)}{v.author ? ` · @${v.author}` : ''}
                    </p>
                    {v.url && (
                      <a href={v.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-heat mt-1 hover:underline">
                        Otwórz na TikToku <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                ))}
              </div>

              {/* Twórcy tych wideo */}
              {view.creators.length > 0 && (
                <div className="mt-7">
                  <h3 className="text-text-hi text-[14px] font-bold mb-3">Twórcy tych wideo</h3>
                  <div className="flex flex-col gap-2">
                    {view.creators.slice(0, 6).map((c) => (
                      <div key={c.handle} className="flex items-center gap-3 bg-bg-surface border border-line rounded-xl px-3 py-2">
                        <span className="w-9 h-9 rounded-full overflow-hidden bg-bg-raised shrink-0 flex items-center justify-center text-text-lo text-xs">
                          {c.avatar ? <img src={c.avatar} alt="" className="w-full h-full object-cover" /> : '👤'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-text-hi truncate">@{c.handle}</p>
                          <p className="text-[11px] text-text-lo">{c.followers != null ? `${fmt(c.followers)} obserw.` : ''}</p>
                        </div>
                        <span className="text-[12px] font-semibold text-profit whitespace-nowrap">▶ {fmt(c.views)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ v, k, accent = false }: { v: string; k: string; accent?: boolean }) {
  return (
    <div className="bg-bg-surface border border-line rounded-xl px-3 py-2.5 text-center">
      <div className={`text-sm font-bold truncate ${accent ? 'text-profit' : 'text-text-hi'}`}>{v}</div>
      <div className="text-[10px] text-text-lo mt-0.5">{k}</div>
    </div>
  )
}
