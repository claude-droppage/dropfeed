'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, useMotionValue, animate } from 'framer-motion'
import { useDrag } from '@use-gesture/react'
import type { FeedItem, FeedMode } from '@/lib/types'
import SwipeCard from './SwipeCard'
import CoachMark from './CoachMark'
import { pl } from '@/lib/i18n/pl'

interface Props {
  items: FeedItem[]
  mode: FeedMode
}

export default function SwipeDeck({ items, mode }: Props) {
  const [index, setIndex] = useState(0)
  const [isMuted, setIsMuted] = useState(true)
  const [coached, setCoached] = useState(false)

  const transitioning = useRef(false)
  const gestureDir = useRef<'v' | 'h' | null>(null)

  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotation = useMotionValue(0)

  const W = () => (typeof window !== 'undefined' ? window.innerWidth : 400)
  const H = () => (typeof window !== 'undefined' ? window.innerHeight : 844)

  const springBack = useCallback(() => {
    animate(x, 0, { type: 'spring', stiffness: 350, damping: 35 })
    animate(y, 0, { type: 'spring', stiffness: 350, damping: 35 })
    animate(rotation, 0, { type: 'spring', stiffness: 350, damping: 35 })
  }, [x, y, rotation])

  const runTransition = useCallback(
    async (action: 'next' | 'prev' | 'save' | 'skip') => {
      if (transitioning.current) return
      const atEnd = index >= items.length - 1
      const atStart = index <= 0

      if ((action === 'next' || action === 'save' || action === 'skip') && atEnd) {
        springBack()
        return
      }
      if (action === 'prev' && atStart) {
        springBack()
        return
      }

      transitioning.current = true

      if (action === 'next') {
        await animate(y, -H(), { duration: 0.28, ease: [0.32, 0.72, 0, 1] })
        y.set(H())
        rotation.set(0)
        x.set(0)
        setIndex((i) => i + 1)
        await animate(y, 0, { type: 'spring', stiffness: 380, damping: 38 })
      } else if (action === 'prev') {
        await animate(y, H(), { duration: 0.28, ease: [0.32, 0.72, 0, 1] })
        y.set(-H())
        rotation.set(0)
        x.set(0)
        setIndex((i) => i - 1)
        await animate(y, 0, { type: 'spring', stiffness: 380, damping: 38 })
      } else if (action === 'save') {
        await animate(x, W() + 80, { duration: 0.22, ease: 'easeIn' })
        x.set(0)
        y.set(0)
        rotation.set(0)
        setIndex((i) => i + 1)
      } else if (action === 'skip') {
        await animate(x, -(W() + 80), { duration: 0.22, ease: 'easeIn' })
        x.set(0)
        y.set(0)
        rotation.set(0)
        setIndex((i) => i + 1)
      }

      transitioning.current = false
    },
    [index, items.length, x, y, rotation, springBack]
  )

  const bind = useDrag(
    ({ movement: [mx, my], first, last, velocity: [vx, vy] }) => {
      if (transitioning.current) return

      if (first) gestureDir.current = null

      if (!gestureDir.current && (Math.abs(mx) > 10 || Math.abs(my) > 10)) {
        gestureDir.current = Math.abs(my) > Math.abs(mx) ? 'v' : 'h'
      }

      if (gestureDir.current === 'v') {
        // Resistance at bounds
        const bounded =
          my < 0 && index >= items.length - 1
            ? my * 0.15
            : my > 0 && index <= 0
              ? my * 0.15
              : my
        y.set(bounded)

        if (last) {
          if ((my < -55 || vy < -0.35) && index < items.length - 1) {
            runTransition('next')
          } else if ((my > 55 || vy > 0.35) && index > 0) {
            runTransition('prev')
          } else {
            animate(y, 0, { type: 'spring', stiffness: 350, damping: 35 })
          }
        }
      } else if (gestureDir.current === 'h') {
        x.set(mx)
        rotation.set((mx / (W() || 400)) * 14)

        if (last) {
          if ((mx > 80 || vx > 0.45) && index < items.length - 1) {
            runTransition('save')
          } else if ((mx < -80 || vx < -0.45) && index < items.length - 1) {
            runTransition('skip')
          } else {
            animate(x, 0, { type: 'spring', stiffness: 350, damping: 35 })
            animate(rotation, 0, { type: 'spring', stiffness: 350, damping: 35 })
          }
        }
      }
    },
    { filterTaps: true, pointer: { touch: true } }
  )

  const item = items[index]

  if (!item) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-bg-void">
        <p className="text-text-lo text-sm">{pl.feed.end}</p>
      </div>
    )
  }

  return (
    <div
      className="absolute inset-0 overflow-hidden touch-none select-none"
      {...bind()}
    >
      <motion.div
        key={index}
        className="absolute inset-0"
        style={{ x, y, rotate: rotation }}
      >
        <SwipeCard
          item={item}
          isMuted={isMuted}
          onSave={() => runTransition('save')}
          onSkip={() => runTransition('skip')}
          onToggleMute={() => setIsMuted((m) => !m)}
        />
      </motion.div>

      {!coached && <CoachMark onDismiss={() => setCoached(true)} />}
    </div>
  )
}
