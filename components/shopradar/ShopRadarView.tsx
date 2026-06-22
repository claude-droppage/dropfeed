'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Store } from 'lucide-react'
import { SwipeSpyLogo } from '@/components/SwipeSpyLogo'
import ProductModal from './ProductModal'

interface P {
  productId: string; title: string; description?: string; imageUrl?: string; videoUrl?: string
  price: number; currency: string; rating?: number; reviewCount?: number; soldCount: number
  estRevenue: number; sellerId?: string; shopName?: string; shopLogo?: string; productUrl?: string; region: string
}

const REGIONS = ['US', 'GB', 'DE', 'FR', 'IT', 'ES', 'IE', 'BR', 'MX', 'JP', 'SG', 'MY', 'PH', 'TH', 'VN', 'ID']
const fmtNum = (n: number) => n.toLocaleString('pl-PL')
const fmtMoney = (n: number, c: string) => `${c}${n.toLocaleString('pl-PL', { maximumFractionDigits: 0 })}`

type Tab = 'products' | 'shops' | 'creators'

export default function ShopRadarView({ query, region, products }: { query: string; region: string; products: P[] }) {
  const router = useRouter()
  const [q, setQ] = useState(query)
  const [reg, setReg] = useState(region)
  const [tab, setTab] = useState<Tab>('products')
  const [sort, setSort] = useState<'revenue' | 'sold'>('revenue')
  const [minRev, setMinRev] = useState(0)
  const [minRating, setMinRating] = useState(0)
  const [priceMax, setPriceMax] = useState(0)
  const [open, setOpen] = useState<P | null>(null)
  const [saved, setSaved] = useState<Set<string>>(new Set())

  const submit = (e: React.FormEvent) => { e.preventDefault(); if (q.trim()) router.push(`/shopradar?q=${encodeURIComponent(q.trim())}&region=${reg}`) }

  const filtered = useMemo(() => {
    let r = products.filter((p) => p.estRevenue >= minRev && (minRating === 0 || (p.rating ?? 0) >= minRating) && (priceMax === 0 || p.price <= priceMax))
    r = [...r].sort((a, b) => (sort === 'revenue' ? b.estRevenue - a.estRevenue : b.soldCount - a.soldCount))
    return r
  }, [products, sort, minRev, minRating, priceMax])

  const shops = useMemo(() => {
    const m = new Map<string, { name: string; logo?: string; rev: number; sold: number; n: number }>()
    for (const p of filtered) {
      const k = p.shopName ?? p.sellerId ?? '?'
      const cur = m.get(k) ?? { name: p.shopName ?? '?', logo: p.shopLogo, rev: 0, sold: 0, n: 0 }
      cur.rev += p.estRevenue; cur.sold += p.soldCount; cur.n += 1; m.set(k, cur)
    }
    return [...m.values()].sort((a, b) => b.rev - a.rev)
  }, [filtered])

  const stats = useMemo(() => ({
    rev: filtered.reduce((s, p) => s + p.estRevenue, 0),
    sold: filtered.reduce((s, p) => s + p.soldCount, 0),
    sellers: new Set(filtered.map((p) => p.sellerId ?? p.shopName)).size,
  }), [filtered])

  const cur = products[0]?.currency ?? '$'

  const save = async (p: P) => {
    setSaved((s) => new Set(s).add(p.productId))
    try {
      await fetch('/api/shopradar/save', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'product', ref_id: p.productId, region: p.region, meta: { title: p.title, image: p.imageUrl, url: p.productUrl } }) })
    } catch { /* fail-open */ }
  }

  return (
    <div className="h-full overflow-y-auto bg-bg-void">
      <div className="mx-auto max-w-6xl px-4 md:px-8 pt-4 pb-16">
        <div className="md:hidden mb-2"><SwipeSpyLogo className="text-[1.15rem]" /></div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-lg md:text-[22px] font-bold tracking-tight text-text-hi">ShopRadar</h1>
          <div className="flex items-center gap-3 text-[12px]">
            <a href="/shopradar/movers" className="text-text-mid hover:text-text-hi">Movers</a>
            <a href="/shopradar/saved" className="text-text-mid hover:text-text-hi">Zapisane</a>
            <a href="/shopradar/brands" className="text-heat hover:underline">Marki i briefy →</a>
          </div>
        </div>
        <p className="text-[12px] text-text-mid mt-0.5 mb-4">Research TikTok Shop — produkty, sprzedaż, sklepy. Dane: rynki LIVE (US/EU). PL niedostępne (TikTok Shop tam nie działa).</p>

        {/* search */}
        <form onSubmit={submit} className="flex gap-2 mb-5">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-lo" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nisza / produkt (np. mini printer, gua sha)…"
              className="w-full bg-bg-surface border border-line rounded-xl pl-9 pr-3 py-2.5 text-sm text-text-hi placeholder:text-text-lo focus:outline-none focus:border-text-lo" />
          </div>
          <select value={reg} onChange={(e) => setReg(e.target.value)} className="bg-bg-surface border border-line rounded-xl px-3 text-sm text-text-hi focus:outline-none">
            {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button type="submit" className="bg-heat text-bg-void font-medium rounded-xl px-4 text-sm">Szukaj</button>
        </form>

        {!query ? (
          <div className="rounded-2xl border border-dashed border-line px-5 py-12 text-center">
            <div className="text-2xl mb-1.5">🔎</div>
            <p className="text-sm font-semibold text-text-hi mb-1">Wpisz niszę, by zobaczyć leaderboard sprzedaży</p>
            <p className="text-[12px] text-text-lo">np. „mini printer", „gua sha", „car gadget" — rynek US lub EU.</p>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-5 py-12 text-center">
            <div className="text-2xl mb-1.5">🫙</div>
            <p className="text-sm font-semibold text-text-hi mb-1">Brak wyników dla „{query}" ({region})</p>
            <p className="text-[12px] text-text-lo">Spróbuj innej frazy lub rynku. PL nie ma TikTok Shop — wybierz US/DE/ES/GB.</p>
          </div>
        ) : (
          <>
            {/* summary */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[['Szac. przychód', fmtMoney(stats.rev, cur)], ['Sprzedane szt.', fmtNum(stats.sold)], ['Sprzedawców', String(stats.sellers)]].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-line bg-bg-surface px-3 py-3 text-center">
                  <div className="font-mono text-xl text-text-hi">{v}</div>
                  <div className="text-[11px] text-text-lo mt-1">{k}</div>
                </div>
              ))}
            </div>

            {/* tabs */}
            <div className="flex gap-2 mb-4">
              {([['products', 'Produkty'], ['shops', 'Sklepy'], ['creators', 'Twórcy']] as const).map(([k, label]) => (
                <button key={k} onClick={() => setTab(k)}
                  className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${tab === k ? 'bg-heat text-bg-void' : 'bg-bg-surface border border-line text-text-mid hover:text-text-hi'}`}>{label}</button>
              ))}
            </div>

            {/* filters */}
            {tab === 'products' && (
              <div className="flex flex-wrap gap-2 mb-4 text-[12px]">
                <select value={sort} onChange={(e) => setSort(e.target.value as 'revenue' | 'sold')} className="bg-bg-surface border border-line rounded-lg px-2 py-1.5 text-text-mid">
                  <option value="revenue">Sort: przychód</option>
                  <option value="sold">Sort: sprzedaż</option>
                </select>
                <select value={minRev} onChange={(e) => setMinRev(Number(e.target.value))} className="bg-bg-surface border border-line rounded-lg px-2 py-1.5 text-text-mid">
                  <option value={0}>Min przychód: dowolny</option><option value={10000}>≥ 10k</option><option value={50000}>≥ 50k</option><option value={100000}>≥ 100k</option>
                </select>
                <select value={minRating} onChange={(e) => setMinRating(Number(e.target.value))} className="bg-bg-surface border border-line rounded-lg px-2 py-1.5 text-text-mid">
                  <option value={0}>Ocena: dowolna</option><option value={4}>≥ 4.0</option><option value={4.5}>≥ 4.5</option>
                </select>
                <select value={priceMax} onChange={(e) => setPriceMax(Number(e.target.value))} className="bg-bg-surface border border-line rounded-lg px-2 py-1.5 text-text-mid">
                  <option value={0}>Cena: dowolna</option><option value={25}>≤ 25</option><option value={50}>≤ 50</option><option value={100}>≤ 100</option>
                </select>
              </div>
            )}

            {/* PRODUCTS leaderboard */}
            {tab === 'products' && (
              <div className="rounded-2xl border border-line overflow-hidden">
                {filtered.map((p, i) => (
                  <button key={p.productId} onClick={() => setOpen(p)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 border-b border-line last:border-0 hover:bg-bg-surface text-left transition-colors">
                    <span className="font-mono text-[12px] text-text-lo w-5 shrink-0">{i + 1}</span>
                    {p.imageUrl ? <img src={p.imageUrl} alt="" loading="lazy" className="w-11 h-11 rounded-lg object-cover shrink-0 bg-bg-raised" /> : <div className="w-11 h-11 rounded-lg bg-bg-raised shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] text-text-hi truncate">{p.title}</div>
                      <div className="text-[11px] text-text-lo truncate">{p.shopName}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-[13px] text-profit">{fmtMoney(p.estRevenue, p.currency)}</div>
                      <div className="font-mono text-[11px] text-text-lo">{fmtNum(p.soldCount)} szt · {p.currency}{p.price}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* SHOPS */}
            {tab === 'shops' && (
              <div className="rounded-2xl border border-line overflow-hidden">
                {shops.map((s, i) => (
                  <div key={s.name + i} className="flex items-center gap-3 px-3 py-2.5 border-b border-line last:border-0">
                    <span className="font-mono text-[12px] text-text-lo w-5">{i + 1}</span>
                    <Store size={16} className="text-text-mid shrink-0" />
                    <div className="min-w-0 flex-1"><div className="text-[13px] text-text-hi truncate">{s.name}</div><div className="text-[11px] text-text-lo">{s.n} produktów</div></div>
                    <div className="text-right"><div className="font-mono text-[13px] text-profit">{fmtMoney(s.rev, cur)}</div><div className="font-mono text-[11px] text-text-lo">{fmtNum(s.sold)} szt</div></div>
                  </div>
                ))}
              </div>
            )}

            {/* CREATORS placeholder (faza 3 — wymaga wideo) */}
            {tab === 'creators' && (
              <div className="rounded-2xl border border-dashed border-line px-5 py-10 text-center">
                <div className="text-xl mb-1">🎬</div>
                <p className="text-sm font-semibold text-text-hi mb-1">Twórcy po wideo</p>
                <p className="text-[12px] text-text-lo">Ranking twórców po wyświetleniach pojawia się po wciągnięciu wideo produktu (otwórz produkt → wideo).</p>
              </div>
            )}
          </>
        )}
      </div>

      {open && <ProductModal product={open} onClose={() => setOpen(null)} onSave={save} isSaved={saved.has(open.productId)} />}
    </div>
  )
}
