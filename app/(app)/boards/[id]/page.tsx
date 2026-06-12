'use client'

import { use } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useBoards } from '@/lib/boards'
import { ads } from '@/lib/data/mock'
import { pl } from '@/lib/i18n/pl'

interface Props {
  params: Promise<{ id: string }>
}

export default function BoardDetailPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const { boards, getBoardItems } = useBoards()

  const board = boards.find((b) => b.id === id)
  const items = getBoardItems(id)

  const adMap = new Map(ads.map((a) => [a.id, a]))

  if (!board) {
    return (
      <div className="h-full flex items-center justify-center bg-bg-void">
        <p className="text-text-lo text-sm">Board nie istnieje</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-bg-void overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0">
        <button
          onClick={() => router.back()}
          className="text-text-lo hover:text-text-hi transition-colors p-0.5"
          aria-label="Wróć"
        >
          <ArrowLeft size={20} />
        </button>
        <p className="font-medium text-text-hi flex-1 truncate">{board.name}</p>
      </div>

      {/* Items grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-full pb-16">
            <p className="text-text-lo text-sm">{pl.boards.emptyBoard}</p>
          </div>
        ) : (
          <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            {[...items].reverse().map((item) => {
              const ad = item.adId ? adMap.get(item.adId) : undefined
              if (!ad) return null
              return (
                <div
                  key={item.id}
                  className="relative aspect-[9/14] bg-bg-raised rounded-xl overflow-hidden"
                >
                  <Image
                    src={ad.creativeUrl}
                    alt={ad.hook ?? ''}
                    fill
                    className="object-cover"
                    sizes="120px"
                    unoptimized
                  />
                  {/* Heat badge */}
                  <div className="absolute top-1.5 left-1.5 bg-heat-deep rounded-full px-1.5 py-0.5">
                    <span className="text-[9px] font-mono text-heat font-medium">
                      {ad.heatScore}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
