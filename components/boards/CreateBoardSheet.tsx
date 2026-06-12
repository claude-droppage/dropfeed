'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { pl } from '@/lib/i18n/pl'

interface Props {
  onConfirm: (name: string) => void
  onClose: () => void
}

export default function CreateBoardSheet({ onConfirm, onClose }: Props) {
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleConfirm = () => {
    if (!name.trim()) return
    onConfirm(name.trim())
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
        <motion.div
          className="absolute inset-0 bg-black/60"
          onClick={onClose}
        />

        {/* Sheet */}
        <motion.div
          className="relative bg-bg-surface border border-line rounded-t-3xl px-5 pt-5 pb-8"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 38 }}
        >
          {/* Handle */}
          <div className="w-10 h-1 bg-line rounded-full mx-auto mb-5" />

          <p className="text-text-hi font-medium text-base mb-4">{pl.boards.create}</p>

          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm() }}
            placeholder={pl.boards.createPlaceholder}
            className="w-full bg-bg-raised border border-line rounded-xl px-4 py-3 text-sm text-text-hi placeholder-text-lo outline-none focus:border-heat transition-colors"
          />

          <button
            onClick={handleConfirm}
            disabled={!name.trim()}
            className="mt-4 w-full bg-heat text-bg-void font-medium text-sm rounded-xl py-3 disabled:opacity-40 transition-opacity"
          >
            {pl.boards.createConfirm}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
