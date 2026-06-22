import Link from 'next/link'
import { ArrowLeft, Bookmark } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SwipeSpyLogo } from '@/components/SwipeSpyLogo'

// Zapisane produkty/wideo (user-scoped).
export const dynamic = 'force-dynamic'

export default async function ShopRadarSavedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data } = user ? await supabase.from('shop_saved').select('*').order('created_at', { ascending: false }) : { data: [] }
  const saved = (data ?? []) as { id: string; kind: string; ref_id: string; region?: string; meta?: Record<string, unknown> }[]

  return (
    <div className="h-full overflow-y-auto bg-bg-void">
      <div className="mx-auto max-w-3xl px-4 md:px-8 pt-4 pb-16">
        <div className="md:hidden mb-2"><SwipeSpyLogo className="text-[1.15rem]" /></div>
        <Link href="/shopradar" className="inline-flex items-center gap-1.5 text-text-lo text-sm mb-4 hover:text-text-mid"><ArrowLeft size={15} /> ShopRadar</Link>
        <h1 className="text-lg md:text-[22px] font-bold tracking-tight text-text-hi flex items-center gap-2"><Bookmark size={18} /> Zapisane</h1>
        <p className="text-[12px] text-text-mid mt-0.5 mb-5">Produkty zapisane z ShopRadar.</p>

        {saved.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-5 py-12 text-center">
            <div className="text-2xl mb-1.5">🔖</div>
            <p className="text-sm font-semibold text-text-hi mb-1">Nic nie zapisano</p>
            <p className="text-[12px] text-text-lo">W ShopRadar otwórz produkt i kliknij „Zapisz".</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {saved.map((s) => (
              <a key={s.id} href={(s.meta?.url as string) ?? '#'} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-line bg-bg-surface overflow-hidden">
                {s.meta?.image ? <img src={s.meta.image as string} alt="" className="w-full aspect-square object-cover" /> : <div className="w-full aspect-square bg-bg-raised" />}
                <div className="px-3 py-2.5 text-[12px] text-text-hi line-clamp-2">{(s.meta?.title as string) ?? s.ref_id}</div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
