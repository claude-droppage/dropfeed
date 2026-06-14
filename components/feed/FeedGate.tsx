'use client'

import { useState, useEffect } from 'react'
import type { FeedItem } from '@/lib/types'
import { loadPreferences } from '@/lib/preferences'
import FeedView from './FeedView'

interface Props {
  /** Strona 1 pobrana server-side; kolejne doładowuje infinite scroll w FeedView */
  serverItems: FeedItem[]
}

export default function FeedGate({ serverItems }: Props) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // middleware gwarantuje onboarding; tu tylko czekamy na montaż klienta
    // (preferencje żyją w localStorage)
    setReady(true)
  }, [])

  if (!ready) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-bg-void">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-text-lo animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    )
  }

  const prefs = loadPreferences()
  return (
    <FeedView
      serverItems={serverItems}
      initialMode={prefs?.feedMode ?? 'products'}
      initialOfferTypes={prefs?.offerTypes ?? null}
    />
  )
}
