'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { FeedItem } from '@/lib/types'
import { getBrandActiveAdCount, getBrandSnapshots } from '@/lib/data/source'
import BrandDeepDive from './BrandDeepDive'

interface Props {
  item: FeedItem | null
  onClose: () => void
}

export default function DeepDiveSheet({ item, onClose }: Props) {
  const [count, setCount] = useState(0)
  const [snapshots, setSnapshots] = useState<{ day: string; count: number }[]>([])

  useEffect(() => {
    if (!item) return
    let cancelled = false
    Promise.all([getBrandActiveAdCount(item.brand.id), getBrandSnapshots(item.brand.id)])
      .then(([c, s]) => { if (!cancelled) { setCount(c); setSnapshots(s) } })
      .catch(() => { if (!cancelled) { setCount(0); setSnapshots([]) } })
    return () => { cancelled = true }
  }, [item])

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          key="dd-sheet"
          className="absolute inset-0 z-40 flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div className="absolute inset-0 bg-black/60" onClick={onClose} />

          <motion.div
            className="relative bg-bg-void border-t border-line rounded-t-3xl flex flex-col"
            style={{ maxHeight: '88dvh' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 36 }}
          >
            <div className="relative flex items-center justify-center px-5 pt-4 pb-2 shrink-0">
              <div className="w-10 h-1 bg-line rounded-full" />
              <button onClick={onClose} className="absolute right-4 top-3.5 p-1 text-text-lo" aria-label="Zamknij">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-4 pb-10 pt-2">
              <BrandDeepDive brand={item.brand} ad={item.ad} brandAdCount={count} snapshots={snapshots} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
