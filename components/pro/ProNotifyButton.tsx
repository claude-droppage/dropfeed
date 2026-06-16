'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { pl } from '@/lib/i18n/pl'

// „Powiadom mnie" → zapisuje intencję Pro (RPC mark_pro_interest). ZERO Stripe.
export default function ProNotifyButton({ initialNotified }: { initialNotified: boolean }) {
  const [notified, setNotified] = useState(initialNotified)
  const [loading, setLoading] = useState(false)

  async function notify() {
    if (notified || loading) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.rpc('mark_pro_interest')
    setLoading(false)
    if (!error) setNotified(true)
  }

  if (notified) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="w-full rounded-[999px] border border-profit/40 bg-profit/10 px-6 py-3.5 flex items-center justify-center gap-2">
          <Check size={16} className="text-profit" />
          <span className="text-profit text-sm font-medium">{pl.pro.notified}</span>
        </div>
        <p className="text-text-lo text-[11px] text-center">{pl.pro.notifiedSub}</p>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={notify}
      disabled={loading}
      className="w-full bg-heat text-[#2A1700] text-sm font-semibold py-3.5 rounded-[999px] hover:brightness-110 disabled:opacity-50 transition-all"
    >
      {loading ? '…' : pl.pro.notify}
    </button>
  )
}
