'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Sparkles, FileText, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { SwipeSpyLogo } from '@/components/SwipeSpyLogo'

interface Brand { id: string; name: string; bible?: string; brief_template?: string; products?: { name: string; description?: string }[] }
interface Brief { id: string; title: string; content: string; created_at: string; competitor_product_id?: string }

export default function BrandsView() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [briefs, setBriefs] = useState<Brief[]>([])
  const [edit, setEdit] = useState<Partial<Brand> | null>(null)
  const [gen, setGen] = useState<{ brandId: string; myProduct: string; competitorProductId: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [openBrief, setOpenBrief] = useState<Brief | null>(null)
  const inp = 'w-full bg-bg-raised border border-line rounded-lg px-3 py-2 text-sm text-text-hi focus:outline-none focus:border-text-lo'

  const load = async () => {
    const [b, br] = await Promise.all([fetch('/api/shopradar/brands').then((r) => r.json()), fetch('/api/shopradar/briefs').then((r) => r.json())])
    setBrands(b.brands ?? []); setBriefs(br.briefs ?? [])
  }
  useEffect(() => { load() }, [])

  const saveBrand = async () => {
    if (!edit?.name) return
    setBusy(true)
    const products = typeof (edit as { productsRaw?: string }).productsRaw === 'string'
      ? (edit as { productsRaw?: string }).productsRaw!.split('\n').filter(Boolean).map((l) => ({ name: l }))
      : edit.products ?? []
    await fetch('/api/shopradar/brands', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...edit, products }) })
    setEdit(null); setBusy(false); load()
  }
  const del = async (id: string) => { await fetch(`/api/shopradar/brands?id=${id}`, { method: 'DELETE' }); load() }
  const generate = async () => {
    if (!gen?.brandId || !gen.competitorProductId) return
    setBusy(true)
    await fetch('/api/shopradar/brief', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(gen) })
    setGen(null); setBusy(false); load()
  }

  return (
    <div className="h-full overflow-y-auto bg-bg-void">
      <div className="mx-auto max-w-3xl px-4 md:px-8 pt-4 pb-16">
        <div className="md:hidden mb-2"><SwipeSpyLogo className="text-[1.15rem]" /></div>
        <Link href="/shopradar" className="inline-flex items-center gap-1.5 text-text-lo text-sm mb-4 hover:text-text-mid"><ArrowLeft size={15} /> ShopRadar</Link>
        <h1 className="text-lg md:text-[22px] font-bold tracking-tight text-text-hi">Marki i briefy</h1>
        <p className="text-[12px] text-text-mid mt-0.5 mb-5">Twoje marki (Brand Bible) + generowane briefy kreatywne pod Twój produkt.</p>

        {/* MARKI */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-text-hi text-sm font-semibold">Marki</h2>
          <button onClick={() => setEdit({})} className="inline-flex items-center gap-1 rounded-full bg-heat text-bg-void text-[12px] font-medium px-3 py-1.5"><Plus size={13} /> Nowa marka</button>
        </div>
        <div className="space-y-2 mb-8">
          {brands.length === 0 && <p className="text-[12px] text-text-lo">Brak marek. Dodaj pierwszą, żeby generować briefy.</p>}
          {brands.map((b) => (
            <div key={b.id} className="rounded-xl border border-line bg-bg-surface p-3">
              <div className="flex items-center justify-between">
                <div className="font-medium text-text-hi text-sm">{b.name}</div>
                <div className="flex gap-2">
                  <button onClick={() => setGen({ brandId: b.id, myProduct: '', competitorProductId: '' })} className="text-heat" title="Generuj brief"><Sparkles size={15} /></button>
                  <button onClick={() => setEdit({ ...b, ...({ productsRaw: (b.products ?? []).map((p) => p.name).join('\n') } as object) })} className="text-text-mid text-[12px]">edytuj</button>
                  <button onClick={() => del(b.id)} className="text-text-lo"><Trash2 size={14} /></button>
                </div>
              </div>
              {b.bible && <p className="text-[11px] text-text-lo mt-1 line-clamp-2">{b.bible}</p>}
              {!!b.products?.length && <p className="text-[11px] text-text-mid mt-1">{b.products.length} produktów</p>}
            </div>
          ))}
        </div>

        {/* BRIEFY */}
        <h2 className="text-text-hi text-sm font-semibold mb-2 flex items-center gap-1.5"><FileText size={14} /> Briefy</h2>
        <div className="space-y-2">
          {briefs.length === 0 && <p className="text-[12px] text-text-lo">Brak briefów. Kliknij ✦ przy marce i podaj ID produktu konkurenta (z ShopRadar).</p>}
          {briefs.map((br) => (
            <button key={br.id} onClick={() => setOpenBrief(br)} className="w-full text-left rounded-xl border border-line bg-bg-surface p-3 hover:border-text-lo">
              <div className="text-sm text-text-hi">{br.title}</div>
              <div className="text-[11px] text-text-lo mt-0.5">{new Date(br.created_at).toLocaleString('pl-PL')}</div>
              <p className="text-[12px] text-text-mid mt-1 line-clamp-2 whitespace-pre-wrap">{br.content}</p>
            </button>
          ))}
        </div>
      </div>

      {/* edytor marki */}
      {edit && (
        <div className="fixed inset-0 z-50 bg-bg-void/80 flex items-center justify-center p-4" onClick={() => setEdit(null)}>
          <div className="bg-bg-surface border border-line rounded-2xl w-full max-w-md p-5 max-h-[90dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-text-hi font-semibold mb-3">{edit.id ? 'Edytuj markę' : 'Nowa marka'}</h3>
            <Field label="Nazwa"><input value={edit.name ?? ''} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={inp} /></Field>
            <Field label="Brand Bible (głos, odbiorca, pozycjonowanie)"><textarea value={edit.bible ?? ''} onChange={(e) => setEdit({ ...edit, bible: e.target.value })} rows={4} className={inp} /></Field>
            <Field label="Szablon briefu (opcjonalnie)"><textarea value={edit.brief_template ?? ''} onChange={(e) => setEdit({ ...edit, brief_template: e.target.value })} rows={2} className={inp} /></Field>
            <Field label="Produkty (1 na linię)"><textarea value={(edit as { productsRaw?: string }).productsRaw ?? ''} onChange={(e) => setEdit({ ...edit, ...({ productsRaw: e.target.value } as object) })} rows={3} className={inp} /></Field>
            <div className="flex gap-2 mt-3">
              <button disabled={busy} onClick={saveBrand} className="flex-1 bg-heat text-bg-void rounded-xl py-2 text-sm font-medium disabled:opacity-50">{busy ? 'Zapisuję…' : 'Zapisz'}</button>
              <button onClick={() => setEdit(null)} className="px-4 border border-line rounded-xl text-sm text-text-mid">Anuluj</button>
            </div>
          </div>
        </div>
      )}

      {/* generator briefu */}
      {gen && (
        <div className="fixed inset-0 z-50 bg-bg-void/80 flex items-center justify-center p-4" onClick={() => setGen(null)}>
          <div className="bg-bg-surface border border-line rounded-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-text-hi font-semibold mb-1">Generuj brief</h3>
            <p className="text-[11px] text-text-lo mb-3">Brief pod produkt Twojej marki, inspirowany produktem konkurenta (teardown + recenzje).</p>
            <Field label="Mój produkt (nazwa/opis)"><input value={gen.myProduct} onChange={(e) => setGen({ ...gen, myProduct: e.target.value })} className={inp} /></Field>
            <Field label="ID produktu konkurenta (z ShopRadar)"><input value={gen.competitorProductId} onChange={(e) => setGen({ ...gen, competitorProductId: e.target.value })} placeholder="np. 1729553368065741562" className={inp} /></Field>
            <div className="flex gap-2 mt-3">
              <button disabled={busy} onClick={generate} className="flex-1 bg-heat text-bg-void rounded-xl py-2 text-sm font-medium disabled:opacity-50">{busy ? 'Generuję…' : 'Generuj'}</button>
              <button onClick={() => setGen(null)} className="px-4 border border-line rounded-xl text-sm text-text-mid">Anuluj</button>
            </div>
          </div>
        </div>
      )}

      {openBrief && (
        <div className="fixed inset-0 z-50 bg-bg-void/80 flex items-center justify-center p-4" onClick={() => setOpenBrief(null)}>
          <div className="bg-bg-surface border border-line rounded-2xl w-full max-w-lg p-5 max-h-[88dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-text-hi font-semibold mb-2">{openBrief.title}</h3>
            <pre className="text-[12px] text-text-mid whitespace-pre-wrap font-sans leading-relaxed">{openBrief.content}</pre>
            <button onClick={() => setOpenBrief(null)} className="mt-4 w-full border border-line rounded-xl py-2 text-sm text-text-mid">Zamknij</button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block mb-2.5"><span className="block text-[11px] text-text-lo mb-1">{label}</span>{children}</label>
}
