'use client'

import Image from 'next/image'
import type { FeedItem } from '@/lib/types'

const isVideoSrc = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url)

interface Props {
  items: FeedItem[]
  /** indeks aktualnie oglądanej pozycji */
  index: number
  /** ile pozycji do przodu preloadować (domyślnie N+1, N+2) */
  ahead?: number
  /** sizes dla next/image — dopasowane do widoku (mobile 100vw, player ~400px) */
  sizes?: string
}

/**
 * Preload kolejnych materiałów (jak TikTok): renderuje ukryte media dla
 * index+1..index+ahead, żeby przeglądarka pobrała je W TLE zanim user do nich
 * dojdzie. NIE ładuje całej listy — tylko najbliższe `ahead` pozycje.
 * - wideo: ukryty <video preload="auto"> (buforuje strumień)
 * - obraz: next/image loading="eager" (pobiera od razu, ten sam URL co karta → cache hit)
 */
export default function FeedMediaPreloader({ items, index, ahead = 2, sizes = '100vw' }: Props) {
  const upcoming: FeedItem[] = []
  for (let i = 1; i <= ahead; i++) {
    const it = items[index + i]
    if (it) upcoming.push(it)
  }

  return (
    <div
      aria-hidden
      style={{ position: 'absolute', width: 1, height: 1, left: -9999, top: 0, opacity: 0, overflow: 'hidden', pointerEvents: 'none' }}
    >
      {upcoming.map((it) => {
        const ad = it.ad
        if (ad.format === 'video' && isVideoSrc(ad.creativeUrl)) {
          return (
            <video key={ad.id} src={ad.creativeUrl} preload="auto" muted playsInline tabIndex={-1} />
          )
        }
        const src = ad.thumbUrl ?? ad.creativeUrl
        return (
          <Image key={ad.id} src={src} alt="" fill sizes={sizes} loading="eager" />
        )
      })}
    </div>
  )
}
