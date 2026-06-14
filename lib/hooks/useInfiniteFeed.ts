'use client'

import { useCallback, useRef, useState } from 'react'
import type { FeedItem, OfferType } from '@/lib/types'
import { FEED_PAGE_SIZE } from '@/lib/types'
import { getFeedPage } from '@/lib/data/source'

interface Args {
  /** Strona 1 wstrzyknięta z serwera (lub [] gdy aktywny filtr offerType). */
  initialItems: FeedItem[]
  offerTypes: OfferType[] | null
}

/**
 * Infinite scroll: trzyma narastającą listę FeedItem i doładowuje kolejne
 * partie po FEED_PAGE_SIZE. Bez „stron"/przycisków — UI woła loadMore() przy
 * zbliżaniu się do końca. Zastępuje wcześniejszy pełny fetch + re-sort.
 */
export function useInfiniteFeed({ initialItems, offerTypes }: Args) {
  const [items, setItems] = useState<FeedItem[]>(initialItems)
  const [hasMore, setHasMore] = useState(
    initialItems.length === 0 || initialItems.length >= FEED_PAGE_SIZE,
  )
  const [loading, setLoading] = useState(false)
  const offsetRef = useRef(initialItems.length)
  const loadingRef = useRef(false)

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return
    loadingRef.current = true
    setLoading(true)
    try {
      const { items: next, hasMore: more } = await getFeedPage({
        offset: offsetRef.current,
        limit: FEED_PAGE_SIZE,
        offerTypes,
      })
      offsetRef.current += next.length
      setItems((prev) => [...prev, ...next])
      setHasMore(more)
    } catch {
      setHasMore(false)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [hasMore, offerTypes])

  return { items, loadMore, hasMore, loading }
}
