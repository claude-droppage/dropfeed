'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { FeedItem } from '@/lib/types'
import { loadPreferences, resolveNiches } from '@/lib/preferences'
import { getNicheWeightedItems } from '@/lib/data/source'
import FeedView from './FeedView'

interface Props {
  /** Items pre-fetched server-side; re-weighted client-side by niche prefs */
  serverItems: FeedItem[]
}

export default function FeedGate({ serverItems }: Props) {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [items, setItems] = useState<FeedItem[]>(serverItems)

  useEffect(() => {
    const prefs = loadPreferences()
    if (!prefs || !prefs.intent || !prefs.feedMode) {
      router.replace('/onboarding')
      return
    }
    try {
      const niches = resolveNiches(prefs.niches ?? [])
      setItems(niches.length ? getNicheWeightedItems(niches) : serverItems)
    } catch {
      setItems(serverItems)
    }
    setReady(true)
  }, [router, serverItems])

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

  const prefs = loadPreferences()!
  return (
    <FeedView
      items={items}
      initialMode={prefs.feedMode}
      initialOfferTypes={prefs.offerTypes}
    />
  )
}
