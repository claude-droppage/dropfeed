import Link from 'next/link'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { SwipeSpyLogo } from '@/components/SwipeSpyLogo'

// Movers — produkty z najszybszym przyrostem sprzedaży (units/day) ze snapshotów.
// Snapshot powstaje przy każdym wyszukaniu; potrzeba ≥2 snapshotów ≥0.5 dnia od siebie.
export const dynamic = 'force-dynamic'

export default async function MoversPage() {
  const admin = createAdminClient()
  const since = new Date(Date.now() - 14 * 86400000).toISOString()
  const { data: snaps } = await admin.from('shop_snapshots').select('product_id, region, captured_at, sold_count').gte('captured_at', since).order('captured_at', { ascending: true })

  const g = new Map<string, { t: number; sold: number }[]>()
  for (const s of (snaps ?? []) as { product_id: string; region: string; captured_at: string; sold_count: number }[]) {
    const k = `${s.product_id}|${s.region}`
    if (!g.has(k)) g.set(k, [])
    g.get(k)!.push({ t: Date.parse(s.captured_at), sold: Number(s.sold_count) })
  }
  const movers: { product_id: string; region: string; perDay: number; sold: number }[] = []
  for (const [k, arr] of g) {
    if (arr.length < 2) continue
    const first = arr[0], last = arr[arr.length - 1]
    const days = (last.t - first.t) / 86400000
    if (days < 0.5) continue
    const perDay = Math.round((last.sold - first.sold) / days)
    if (perDay <= 0) continue
    const [product_id, region] = k.split('|')
    movers.push({ product_id, region, perDay, sold: last.sold })
  }
  movers.sort((a, b) => b.perDay - a.perDay)
  const top = movers.slice(0, 40)

  const ids = top.map((m) => m.product_id)
  const { data: prods } = ids.length
    ? await admin.from('shop_products').select('product_id, region, title, image_url, product_url, currency, price').in('product_id', ids)
    : { data: [] }
  const pm = new Map(((prods ?? []) as Record<string, unknown>[]).map((p) => [`${p.product_id}|${p.region}`, p]))

  return (
    <div className="h-full overflow-y-auto bg-bg-void">
      <div className="mx-auto max-w-3xl px-4 md:px-8 pt-4 pb-16">
        <div className="md:hidden mb-2"><SwipeSpyLogo className="text-[1.15rem]" /></div>
        <Link href="/shopradar" className="inline-flex items-center gap-1.5 text-text-lo text-sm mb-4 hover:text-text-mid"><ArrowLeft size={15} /> ShopRadar</Link>
        <h1 className="text-lg md:text-[22px] font-bold tracking-tight text-text-hi flex items-center gap-2"><TrendingUp size={20} className="text-profit" /> Movers</h1>
        <p className="text-[12px] text-text-mid mt-0.5 mb-5">Najszybciej rosnące produkty (sztuki/dzień). Historia narasta z każdym wyszukaniem.</p>

        {top.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-5 py-12 text-center">
            <div className="text-2xl mb-1.5">📈</div>
            <p className="text-sm font-semibold text-text-hi mb-1">Za mało danych</p>
            <p className="text-[12px] text-text-lo">Movers liczą się z ≥2 snapshotów (≥pół dnia odstępu). Szukaj nisz w ShopRadar — historia narasta.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-line overflow-hidden">
            {top.map((m, i) => {
              const p = pm.get(`${m.product_id}|${m.region}`) as Record<string, unknown> | undefined
              return (
                <a key={`${m.product_id}-${i}`} href={(p?.product_url as string) ?? '#'} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2.5 border-b border-line last:border-0 hover:bg-bg-surface">
                  <span className="font-mono text-[12px] text-text-lo w-5">{i + 1}</span>
                  {p?.image_url ? <img src={p.image_url as string} alt="" className="w-11 h-11 rounded-lg object-cover bg-bg-raised" /> : <div className="w-11 h-11 rounded-lg bg-bg-raised" />}
                  <div className="min-w-0 flex-1"><div className="text-[13px] text-text-hi truncate">{(p?.title as string) ?? m.product_id}</div><div className="text-[11px] text-text-lo">{m.region} · {m.sold.toLocaleString('pl-PL')} szt łącznie</div></div>
                  <div className="font-mono text-[13px] text-profit shrink-0">▲ {m.perDay.toLocaleString('pl-PL')}/dzień</div>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
