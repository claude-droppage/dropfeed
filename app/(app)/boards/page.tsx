'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useBoards } from '@/lib/boards'
import { ads } from '@/lib/data/mock'
import BoardCard from '@/components/boards/BoardCard'
import CreateBoardSheet from '@/components/boards/CreateBoardSheet'
import { pl } from '@/lib/i18n/pl'

export default function BoardsPage() {
  const router = useRouter()
  const { boards, getBoardItems, getBoardItemCount, createBoard } = useBoards()
  const [showCreate, setShowCreate] = useState(false)

  // Build a lookup map for ad creative URLs
  const adMap = new Map(ads.map((a) => [a.id, a.creativeUrl]))

  function getThumbnails(boardId: string): string[] {
    return getBoardItems(boardId)
      .slice(-4)
      .map((item) => (item.adId ? (adMap.get(item.adId) ?? '') : ''))
      .filter(Boolean)
  }

  return (
    <div className="h-full flex flex-col bg-bg-void overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
        <p className="font-medium text-text-hi">{pl.boards.title}</p>
        <button
          onClick={() => setShowCreate(true)}
          className="w-8 h-8 flex items-center justify-center text-text-lo hover:text-heat transition-colors"
          aria-label={pl.boards.create}
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Board grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 pb-16">
            <p className="text-text-lo text-sm">{pl.boards.empty}</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-heat text-sm font-medium"
            >
              {pl.boards.create}
            </button>
          </div>
        ) : (
          <div className="grid gap-2.5" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {boards.map((board) => (
              <BoardCard
                key={board.id}
                board={board}
                itemCount={getBoardItemCount(board.id)}
                thumbnails={getThumbnails(board.id)}
                onClick={() => router.push(`/boards/${board.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create sheet */}
      {showCreate && (
        <CreateBoardSheet
          onConfirm={(name) => {
            createBoard(name)
            setShowCreate(false)
          }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  )
}
