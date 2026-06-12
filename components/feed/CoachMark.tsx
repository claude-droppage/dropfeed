'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp, ArrowRight, ArrowLeft } from 'lucide-react'

const STORAGE_KEY = 'dropfeed_coached_v1'

interface Props {
  onDismiss: () => void
}

export default function CoachMark({ onDismiss }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof localStorage !== 'undefined' && !localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
      const t = setTimeout(() => dismiss(), 4000)
      return () => clearTimeout(t)
    }
  }, [])

  const dismiss = () => {
    setVisible(false)
    localStorage.setItem(STORAGE_KEY, '1')
    onDismiss()
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none"
          style={{ background: 'rgba(11,11,14,.55)' }}
        >
          {/* Up arrow */}
          <div className="flex flex-col items-center gap-1 mb-12">
            <ArrowUp size={22} className="text-text-hi" />
            <span className="text-[11px] text-text-mid">następna</span>
          </div>

          {/* Horizontal hints */}
          <div className="flex items-center gap-20 mb-12">
            <div className="flex flex-col items-center gap-1">
              <ArrowLeft size={20} className="text-text-mid" />
              <span className="text-[11px] text-text-lo">pomiń</span>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-text-lo/40" />
            <div className="flex flex-col items-center gap-1">
              <ArrowRight size={20} className="text-heat" />
              <span className="text-[11px] text-heat">zapisz</span>
            </div>
          </div>

          {/* Down arrow */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[11px] text-text-mid">poprzednia</span>
            <ArrowUp size={22} className="text-text-hi rotate-180" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
