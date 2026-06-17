'use client'

import { useState } from 'react'
import type { TikTokShopResult, TikTokShopItem, ShopMarket } from '@/lib/types'

export default function ShopView({ us, pl }: { us: TikTokShopResult; pl: TikTokShopResult }) {
  const [market, setMarket] = useState<ShopMarket>('US')
  const data = market === 'US' ? us : pl

  return (
    <div className="h-full overflow-y-auto bg-bg-void">
      <div className="mx-auto max-w-xl px-4 md:px-6 pt-4 pb-10">
        {/* header */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg md:text-[22px] font-bold tracking-tight text-text-hi">TikTok Shop</h1>
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-text-mid bg-bg-surface border border-line rounded-full px-2.5 py-1">
            <span className="text-profit">●</span> live
          </span>
        </div>

        {/* toggle PL / US */}
        <div className="flex bg-bg-surface border border-line rounded-[10px] p-[3px] gap-0.5 mb-5">
          {(['PL', 'US'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMarket(m)}
              className={`flex-1 text-[13px] font-semibold py-2 rounded-[7px] transition-colors ${
                market === m ? 'bg-heat text-[#0a0b0d]' : 'text-text-mid hover:text-text-hi'
              }`}
            >
              {m === 'PL' ? '🇵🇱 Polska' : '🇺🇸 USA'}
            </button>
          ))}
        </div>

        {data.state === 'live' ? (
          <>
            <div className="mb-3">
              <h2 className="text-base font-bold text-text-hi">Bestsellery</h2>
              <p className="text-xs text-text-lo mt-0.5">Realne liczby sprzedaży · ostatnie 7 dni</p>
            </div>
            <div className="flex flex-col gap-2.5">
              {data.items.map((it) => <ShopRow key={it.rank} item={it} />)}
            </div>
          </>
        ) : (
          <>
            {/* świeży rynek PL */}
            <div className="rounded-2xl border border-dashed border-line px-5 py-6 text-center mb-6">
              <div className="text-3xl mb-2">🌱</div>
              <p className="text-sm font-semibold text-text-hi mb-1.5">Rynek PL śledzimy od dnia zero</p>
              <p className="text-[12px] text-text-lo leading-relaxed">
                TikTok Shop ruszył w Polsce 15 czerwca. Zbieramy dane sprzedaży od startu — bestsellery pojawią się tu, gdy uzbiera się pierwsza sprzedaż. Jesteś wśród pierwszych, którzy to zobaczą.
              </p>
            </div>
            {data.firstMoves && data.firstMoves.length > 0 && (
              <>
                <h2 className="text-[15px] font-bold text-text-hi mb-2.5">Pierwsze ruchy</h2>
                <div className="flex flex-col gap-2.5">
                  {data.firstMoves.map((it) => <ShopRow key={it.rank} item={it} />)}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ShopRow({ item }: { item: TikTokShopItem }) {
  const cls = 'flex items-center gap-3 bg-bg-surface border border-line rounded-[13px] px-3 py-2.5'
  const inner = (
    <>
      <span className="w-5 text-center text-sm font-extrabold text-text-lo shrink-0">{item.rank}</span>
      <span className="w-[46px] h-[46px] rounded-[9px] shrink-0 overflow-hidden flex items-center justify-center text-2xl bg-gradient-to-b from-bg-raised to-bg-void">
        {item.thumbUrl ? <img src={item.thumbUrl} alt="" loading="lazy" className="w-full h-full object-cover" /> : item.emoji}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-text-hi truncate">{item.name}</p>
        <p className="text-[12px] mt-1">
          <span className="font-bold text-profit">{item.sold}</span>
          <span className="text-text-lo font-medium text-[11px]"> sprzedanych</span>
          {item.price && <span className="text-text-mid"> · {item.price}</span>}
        </p>
      </div>
      {item.trend && <span className="text-[12px] font-bold text-profit whitespace-nowrap">{item.trend}</span>}
    </>
  )
  return item.url ? (
    <a href={item.url} target="_blank" rel="noopener noreferrer" className={`${cls} hover:border-text-mid transition-colors`}>{inner}</a>
  ) : (
    <div className={cls}>{inner}</div>
  )
}
