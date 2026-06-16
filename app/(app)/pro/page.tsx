import Link from 'next/link'
import { Check, Sparkles, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { pl } from '@/lib/i18n/pl'
import ProNotifyButton from '@/components/pro/ProNotifyButton'
import { SwipeSpyLogo } from '@/components/SwipeSpyLogo'

export default async function ProPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users')
    .select('pro_interest_at')
    .eq('id', user!.id)
    .maybeSingle()
  const alreadyNotified = !!profile?.pro_interest_at

  return (
    <div className="h-full overflow-y-auto bg-bg-void">
      <div className="mx-auto max-w-md px-6 pt-8 pb-16 flex flex-col">
        <div className="mb-6">
          <SwipeSpyLogo className="text-[1.2rem]" />
        </div>
        <Link href="/feed" className="inline-flex items-center gap-1.5 text-text-lo text-sm mb-8 hover:text-text-mid transition-colors">
          <ArrowLeft size={15} />
          {pl.pro.back}
        </Link>

        {/* Nagłówek */}
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-heat-deep border border-heat/30 rounded-full px-2.5 py-1 flex items-center gap-1.5">
            <Sparkles size={12} className="text-heat" />
            <span className="text-[11px] font-medium text-heat">{pl.profile.planPro}</span>
          </span>
        </div>
        <h1 className="text-text-hi text-3xl font-semibold tracking-tight mb-2">{pl.pro.title}</h1>
        <p className="text-text-mid text-sm mb-8">{pl.pro.sub}</p>

        {/* Cena */}
        <div className="rounded-2xl border border-line bg-bg-surface px-5 py-5 mb-6">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-text-hi text-3xl font-semibold">{pl.pro.price}</span>
            <span className="text-text-mid text-sm">{pl.pro.pricePeriod}</span>
          </div>
          <p className="text-text-lo text-xs mt-1">{pl.pro.priceYear}</p>
        </div>

        {/* Korzyści */}
        <ul className="flex flex-col gap-3 mb-9">
          {pl.pro.perks.map((perk) => (
            <li key={perk} className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-heat/15 flex items-center justify-center shrink-0">
                <Check size={12} className="text-heat" />
              </span>
              <span className="text-text-hi text-sm">{perk}</span>
            </li>
          ))}
        </ul>

        <ProNotifyButton initialNotified={alreadyNotified} />
      </div>
    </div>
  )
}
