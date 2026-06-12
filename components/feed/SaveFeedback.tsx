'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'

interface Props {
  boardName: string
  onDone: () => void
}

export default function SaveFeedback({ boardName, onDone }: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 1400)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex flex-col items-center justify-center gap-4">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.5, 1.1], opacity: [0, 1, 1] }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="text-heat drop-shadow-lg"
      >
        <Heart size={72} fill="currentColor" strokeWidth={0} />
      </motion.div>

      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 6, opacity: 0 }}
        transition={{ delay: 0.12, duration: 0.2 }}
        className="bg-bg-raised/90 border border-line rounded-full px-4 py-2 text-sm text-text-hi font-medium"
      >
        {`Zapisano · ${boardName}`}
      </motion.div>
    </div>
  )
}
