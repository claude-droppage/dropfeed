'use client'

import Image from 'next/image'
import type { Board } from '@/lib/types'

interface Props {
  board: Board
  itemCount: number
  thumbnails: string[]
  onClick: () => void
}

function pluralItems(n: number): string {
  if (n === 1) return '1 pozycja'
  if (n >= 2 && n <= 4) return `${n} pozycje`
  return `${n} pozycji`
}

export default function BoardCard({ board, itemCount, thumbnails, onClick }: Props) {
  const cells = Array.from({ length: 4 }, (_, i) => thumbnails[i] ?? null)

  return (
    <button
      onClick={onClick}
      className="text-left bg-bg-surface border border-line rounded-2xl overflow-hidden w-full transition-opacity active:opacity-70"
    >
      {/* 2×2 thumbnail grid */}
      <div
        className="grid gap-px"
        style={{ gridTemplateColumns: '1fr 1fr', height: '90px' }}
      >
        {cells.map((url, i) =>
          url ? (
            <div key={i} className="relative overflow-hidden bg-bg-raised">
              <Image src={url} alt="" fill className="object-cover" sizes="80px" unoptimized />
            </div>
          ) : (
            <div key={i} className="bg-bg-raised" />
          ),
        )}
      </div>

      {/* Label */}
      <div className="px-3 py-2.5">
        <p className="text-[13px] font-medium text-text-hi truncate">{board.name}</p>
        <p className="text-[11px] text-text-lo mt-0.5">{pluralItems(itemCount)}</p>
      </div>
    </button>
  )
}
