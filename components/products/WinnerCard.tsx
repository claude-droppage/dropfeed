'use client'

import { useRef } from 'react'
import { ExternalLink } from 'lucide-react'
import type { ProductWinner } from '@/lib/types'

const FLAG: Record<string, string> = { PL: '🇵🇱', US: '🇺🇸', GB: '🇬🇧', UK: '🇬🇧', DE: '🇩🇪', FR: '🇫🇷', ES: '🇪🇸', IT: '🇮🇹' }
const flag = (c?: string) => (c ? FLAG[c.toUpperCase()] ?? '🌍' : '🌍')
const fmt = (n?: number | null) => (n == null ? '—' : n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',')} tys.` : String(Math.round(n)))
const isMp4 = (u?: string) => !!u && /\.(mp4|webm|mov)(\?|$)/i.test(u)

// reason chips wg realnego sygnału (mint=skala, blue=walidacja/cross, amber=świeży)
function Chips({ w }: { w: ProductWinner }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {w.isValidated && <Chip c="blue">⌖ <span className="font-mono">{w.storesCount}</span> sklepów</Chip>}
      {w.newAds7d > 0 && <Chip c="profit">▲ <span className="font-mono">+{w.newAds7d}</span> reklam/7d</Chip>}
      {w.momentumDelta > 0 && <Chip c="profit">↑ skaluje</Chip>}
      {w.isFresh && <Chip c="heat">✦ nowy</Chip>}
      {w.hasForeign && <Chip c="blue">🌍 zagranica</Chip>}
    </div>
  )
}
const CC: Record<string, string> = { profit: 'bg-profit/12 text-profit', blue: 'bg-blue/12 text-blue', heat: 'bg-heat/12 text-heat' }
function Chip({ c, children }: { c: 'profit' | 'blue' | 'heat'; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-1.5 py-0.5 rounded ${CC[c]}`}>{children}</span>
}

export default function WinnerCard({ w, onOpen }: { w: ProductWinner; onOpen: () => void }) {
  const vid = useRef<HTMLVideoElement>(null)
  const playable = w.isVideo && isMp4(w.repVideo)

  return (
    <div
      role="button" tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      onMouseEnter={() => playable && vid.current?.play().catch(() => {})}
      onMouseLeave={() => { if (playable && vid.current) { vid.current.pause(); vid.current.currentTime = 0 } }}
      className="group bg-bg-surface border border-line rounded-2xl overflow-hidden cursor-pointer hover:border-text-mid transition-colors outline-none focus-visible:ring-2 focus-visible:ring-heat/40"
    >
      {/* kreacja: wideo (hover-play) z posterem; fallback miniatura */}
      <div className="relative aspect-[4/5] bg-bg-raised overflow-hidden">
        {playable ? (
          <video ref={vid} src={w.repVideo} poster={w.repThumb} muted loop playsInline preload="none"
            className="w-full h-full object-cover" />
        ) : w.repThumb ? (
          <img src={w.repThumb} alt="" loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">📦</div>
        )}
        {playable && (
          <span className="absolute top-2 right-2 text-[10px] font-semibold text-text-hi bg-bg-void/70 backdrop-blur px-1.5 py-0.5 rounded group-hover:opacity-0 transition-opacity">▶ wideo</span>
        )}
        <span className="absolute bottom-2 left-2"><Chips w={w} /></span>
      </div>

      <div className="p-3">
        {/* logo fanpage + marka */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-5 h-5 rounded-full overflow-hidden bg-bg-raised shrink-0 flex items-center justify-center text-[9px] font-bold text-text-lo">
            {w.logoUrl ? <img src={w.logoUrl} alt="" className="w-full h-full object-cover" /> : (w.avatarInitials ?? '?')}
          </span>
          <span className="text-[11px] text-text-lo truncate">{w.brandName}</span>
          <span className="text-[11px] ml-auto">{flag(w.country)}</span>
        </div>
        <p className="text-[13px] font-semibold text-text-hi leading-snug line-clamp-2 min-h-[2.5em]">{w.name}</p>

        {/* twarde liczby */}
        <div className="flex items-center gap-x-2 gap-y-1 flex-wrap text-[11px] text-text-mid mt-2 font-mono">
          <span><b className="text-text-hi">{w.adCount}</b> aktywnych reklam</span>
          <span className="text-text-lo">·</span>
          <span>chodzi <b className="text-text-hi">{w.oldestAge}</b> dni</span>
          {w.price != null && <><span className="text-text-lo">·</span><span className="text-text-hi font-semibold">{w.price} zł</span></>}
        </div>

        {/* akcje */}
        <div className="flex items-center gap-3 mt-2.5">
          <button type="button" onClick={(e) => { e.stopPropagation(); onOpen() }}
            className="text-[11px] font-semibold text-heat hover:underline">reklamy tego produktu →</button>
          {w.offerUrl && (
            <a href={w.offerUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[11px] text-text-mid hover:text-text-hi ml-auto">
              sklep <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export { fmt }
