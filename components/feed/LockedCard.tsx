'use client'

import { Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { pl } from '@/lib/i18n/pl'

// Pełnoekranowa karta blokady — pokazywana zamiast SwipeCard, gdy aktywna reklama
// przekracza dzienny limit (nowa karta w przód po wyczerpaniu puli).
export default function LockedCard() {
  const router = useRouter()
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-void px-8 text-center">
      <div className="w-16 h-16 rounded-full bg-bg-raised border border-line flex items-center justify-center mb-5">
        <Lock size={26} className="text-heat" />
      </div>
      <h2 className="text-text-hi text-xl font-semibold mb-2">{pl.feed.locked.title}</h2>
      <p className="text-text-mid text-sm leading-relaxed max-w-xs mb-7">{pl.feed.locked.sub}</p>
      <button
        type="button"
        onClick={() => router.push('/pro')}
        className="bg-heat text-[#2A1700] text-sm font-semibold px-7 py-3 rounded-[999px] hover:brightness-110 transition-all"
      >
        {pl.feed.locked.cta}
      </button>
    </div>
  )
}
