'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import type { Board } from '@/lib/types'
import CreateBoardSheet from './CreateBoardSheet'
import { pl } from '@/lib/i18n/pl'

function pluralItems(n: number): string {
  if (n === 1) return '1 pozycja'
  if (n >= 2 && n <= 4) return `${n} pozycje`
  return `${n} pozycji`
}

interface Props {
  boards: Board[]
  getBoardItemCount: (id: string) => number
  onSelect: (boardId: string) => void
  onCreateAndSelect: (name: string) => void
  onClose: () => void
}

export default function BoardPickerSheet({
  boards,
  getBoardItemCount,
  onSelect,
  onCreateAndSelect,
  onClose,
}: Props) {
  const [showCreate, setShowCreate] = useState(false)

  if (showCreate) {
    return (
      <CreateBoardSheet
        onConfirm={(name) => {
          onCreateAndSelect(name)
        }}
        onClose={() => setShowCreate(false)}
      />
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        className="absolute inset-0 z-50 flex flex-col justify-end"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div className="absolute inset-0 bg-black/60" onClick={onClose} />

        {/* Sheet */}
        <motion.div
          className="relative bg-bg-surface border border-line rounded-t-3xl pb-8 max-h-[70dvh] flex flex-col"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 38 }}
        >
          {/* Handle + header */}
          <div className="px-5 pt-5 pb-3 shrink-0">
            <div className="w-10 h-1 bg-line rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between">
              <p className="text-text-hi font-medium text-base">{pl.boards.pickBoard}</p>
              <button onClick={onClose} className="text-text-lo p-1">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Board list */}
          <div className="overflow-y-auto flex-1 px-5 pb-2">
            {/* New board button */}
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-3 w-full py-3 text-heat"
            >
              <div className="w-10 h-10 rounded-xl bg-heat-deep border border-heat/30 flex items-center justify-center shrink-0">
                <Plus size={18} />
              </div>
              <span className="text-sm font-medium">{pl.boards.create}</span>
            </button>

            {boards.length === 0 && (
              <p className="text-text-lo text-xs text-center py-4">{pl.boards.noBoards}</p>
            )}

            {boards.map((board) => (
              <button
                key={board.id}
                onClick={() => onSelect(board.id)}
                className="flex items-center gap-3 w-full py-3 border-t border-line"
              >
                <div className="w-10 h-10 rounded-xl bg-bg-raised shrink-0" />
                <div className="text-left">
                  <p className="text-sm text-text-hi">{board.name}</p>
                  <p className="text-[11px] text-text-lo">{pluralItems(getBoardItemCount(board.id))}</p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
