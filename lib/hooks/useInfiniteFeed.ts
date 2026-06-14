'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FeedItem, OfferType, Niche } from '@/lib/types'
import { FEED_PAGE_SIZE } from '@/lib/types'
import { getFeedPage } from '@/lib/data/source'

interface Args {
  offerTypes: OfferType[] | null
  /** seed sesji — stały przez całe scrollowanie (deterministyczny porządek, bez duplikatów) */
  seed: number
  /** preferowane nisze z onboardingu (ważenie + różnorodność) */
  preferredNiches: Niche[] | null
}

/**
 * Infinite scroll: narastająca lista FeedItem, partie po FEED_PAGE_SIZE.
 * Porządek deterministyczny z (seed, preferencje) — te same parametry przy każdym
 * loadMore → kolejne strony to rozłączne wycinki (zero duplikatów). Strona 1
 * ładowana na montażu.
 */
export function useInfiniteFeed({ offerTypes, seed, preferredNiches }: Args) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const offsetRef = useRef(0)
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
        seed,
        preferredNiches,
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
  }, [hasMore, offerTypes, seed, preferredNiches])

  // Strona 1 na montażu (seed/preferencje już ustalone w FeedView)
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    loadMore()
  }, [loadMore])

  return { items, loadMore, hasMore, loading }
}
