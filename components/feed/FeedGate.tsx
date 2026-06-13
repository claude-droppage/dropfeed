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
    if (!prefs) {
      router.replace('/onboarding')
      return
    }
    // Apply niche weighting client-side (will become a Supabase query in Etap 1)
    const niches = resolveNiches(prefs.niches)
    setItems(niches.length ? getNicheWeightedItems(niches) : serverItems)
    setReady(true)
  }, [router, serverItems])

  if (!ready) return null

  const prefs = loadPreferences()!
  return (
    <FeedView
      items={items}
      initialMode={prefs.feedMode}
      initialOfferTypes={prefs.offerTypes}
    />
  )
}
