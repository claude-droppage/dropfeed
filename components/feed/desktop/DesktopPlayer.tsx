'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, X, Flame } from 'lucide-react'
import type { FeedItem } from '@/lib/types'
import FeedMediaPreloader from '../FeedMediaPreloader'

const isVideoSrc = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url)

interface Props {
  items: FeedItem[]
  selectedIdx: number
  onSelect: (idx: number) => void
  onClose: () => void
  /** ile kart wolno przeglądać w playerze (free: do limitu; reszta = blur w gridzie) */
  playableCount?: number
}

export default function DesktopPlayer({ items, selectedIdx, onSelect, onClose, playableCount }: Props) {
  const item = items[selectedIdx]
  const maxPlayable = Math.min(items.length, playableCount ?? items.length)
  const canPrev = selectedIdx > 0
  // nie wchodzimy strzałką w rozmyte karty (poza limitem)
  const canNext = selectedIdx < maxPlayable - 1

  /* ── Keyboard shortcuts ─────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire when typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if ((e.key === 'ArrowRight' || e.key === 'ArrowDown') && canNext) {
        onSelect(selectedIdx + 1)
      } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowUp') && canPrev) {
        onSelect(selectedIdx - 1)
      } else if (e.key === 's' || e.key === 'S') {
        // TODO: save to board
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedIdx, canPrev, canNext, onSelect, onClose])

  if (!item) return null
  const { ad } = item
  const freshnessWidth = `${Math.min((ad.ageInDays / 90) * 100, 100).toFixed(0)}%`

  return (
    <div className="flex flex-col h-full">
      {/* Preload N+1, N+2 — gotowe zanim user przejdzie strzałkami */}
      <FeedMediaPreloader items={items} index={selectedIdx} ahead={2} sizes="400px" />

      {/* Controls bar */}
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-line bg-bg-void shrink-0">
        <button
          onClick={() => canPrev && onSelect(selectedIdx - 1)}
          disabled={!canPrev}
          className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-text-hi disabled:opacity-25 hover:border-text-mid hover:text-text-hi transition-colors"
          aria-label="Poprzednia"
        >
          <ArrowLeft size={14} />
        </button>
        <button
          onClick={() => canNext && onSelect(selectedIdx + 1)}
          disabled={!canNext}
          className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-text-hi disabled:opacity-25 hover:border-text-mid hover:text-text-hi transition-colors"
          aria-label="Następna"
        >
          <ArrowRight size={14} />
        </button>
        <span className="text-text-lo text-xs font-mono">
          {selectedIdx + 1}&nbsp;/&nbsp;{items.length}
        </span>

        <div className="flex-1" />

        {/* Keyboard hints */}
        <span className="text-text-lo text-[11px] flex items-center gap-2">
          <span>
            <Kbd>←</Kbd>/<Kbd>→</Kbd> nawigacja
          </span>
          <span>
            <Kbd>S</Kbd> zapisz
          </span>
          <span>
            <Kbd>Esc</Kbd> grid
          </span>
        </span>

        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-text-mid hover:text-text-hi hover:border-text-mid transition-colors ml-2"
          aria-label="Zamknij player"
        >
          <X size={14} />
        </button>
      </div>

      {/* Creative — centered 9:16 */}
      <div className="flex-1 flex items-center justify-center p-6 min-h-0 bg-bg-void">
        <div
          className="relative rounded-[18px] overflow-hidden bg-bg-raised"
          style={{ aspectRatio: '9/16', height: 'min(600px, calc(100vh - 200px))' }}
        >
          {ad.format === 'video' && isVideoSrc(ad.creativeUrl) ? (
            <video
              key={ad.id}
              src={ad.creativeUrl}
              autoPlay
              muted
              playsInline
              loop
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              {/* Rozmyte tło wypełnia boki (Instagram-style) */}
              <Image
                key={`${ad.id}-bg`}
                src={ad.creativeUrl}
                alt=""
                fill
                sizes="400px"
                aria-hidden
                className="object-cover scale-110 blur-2xl"
                draggable={false}
              />
              {/* Ostry obraz w pełnej proporcji, wyśrodkowany (bez ucinania) */}
              <Image
                key={ad.id}
                src={ad.creativeUrl}
                alt=""
                fill
                sizes="400px"
                className="object-contain"
                draggable={false}
              />
            </>
          )}

          {/* Bottom scrim */}
          <div
            className="absolute inset-x-0 bottom-0 h-2/5 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(11,11,14,.78) 0%, transparent 100%)' }}
          />

          {/* Heat badge */}
          <span className="absolute top-3 left-3 flex items-center gap-1 bg-[rgba(65,36,2,0.93)] text-[#FAC775] text-[11px] font-mono font-medium px-2.5 py-1 rounded-[999px]">
            <Flame size={10} />
            {Math.round(ad.heatScore)}
          </span>

          {/* Freshness bar */}
          <div className="absolute bottom-0 inset-x-0 h-1 bg-line">
            <div
              className="h-full bg-heat"
              style={{ width: freshnessWidth, transition: 'width .7s ease-out' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="bg-bg-raised border border-line rounded px-1.5 py-0.5 font-mono text-[10px] text-text-mid">
      {children}
    </kbd>
  )
}
