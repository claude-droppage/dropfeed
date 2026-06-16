'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type AdStatus = 'allowed' | 'locked'

interface ConsumeResult {
  allowed?: boolean
  used?: number
  remaining?: number
  limit?: number | null
  unlimited?: boolean
}

/**
 * Dzienny limit reklam (freemium). Stan z RPC ad_view_status; noteView() woła
 * consume_ad_view przy przejściu na NOWĄ reklamę w przód. Liczenie jest
 * idempotentne server-side (powrót do obejrzanej karty nie zużywa), więc
 * trzymamy lokalnie status per reklama, żeby:
 *  - nie wołać consume dla już znanych kart (cofanie),
 *  - wiedzieć, którą kartę pokazać jako zablokowaną.
 * Fail-open: błąd RPC nie blokuje feedu.
 */
export function useAdLimit() {
  const supabase = useMemo(() => createClient(), [])
  const [limit, setLimit] = useState<number | null>(20)
  const [remaining, setRemaining] = useState<number | null>(null) // null = jeszcze nieznane
  const [unlimited, setUnlimited] = useState(false)
  const [status, setStatus] = useState<Record<string, AdStatus>>({})

  const statusRef = useRef(status)
  statusRef.current = status
  const remainingRef = useRef(remaining)
  remainingRef.current = remaining
  const unlimitedRef = useRef(unlimited)
  unlimitedRef.current = unlimited
  const inflight = useRef<Set<string>>(new Set())

  useEffect(() => {
    let alive = true
    supabase.rpc('ad_view_status').then(({ data }) => {
      if (!alive || !data) return
      const d = data as ConsumeResult
      if (d.unlimited) { setUnlimited(true); setLimit(null); return }
      setLimit(d.limit ?? 20)
      setRemaining(typeof d.remaining === 'number' ? d.remaining : null)
    })
    return () => { alive = false }
  }, [supabase])

  const noteView = useCallback(
    async (adId: string) => {
      if (unlimitedRef.current || statusRef.current[adId]) return
      // brak budżetu → zablokuj optymistycznie (bez migania treści), serwer potwierdzi
      if (remainingRef.current !== null && remainingRef.current <= 0) {
        setStatus((s) => (s[adId] ? s : { ...s, [adId]: 'locked' }))
      }
      if (inflight.current.has(adId)) return
      inflight.current.add(adId)
      const { data, error } = await supabase.rpc('consume_ad_view', { p_ad_id: adId })
      inflight.current.delete(adId)
      if (error || !data) {
        setStatus((s) => ({ ...s, [adId]: 'allowed' })) // fail-open
        return
      }
      const d = data as ConsumeResult
      if (d.unlimited) {
        setUnlimited(true)
        setStatus((s) => ({ ...s, [adId]: 'allowed' }))
        return
      }
      setStatus((s) => ({ ...s, [adId]: d.allowed ? 'allowed' : 'locked' }))
      if (typeof d.remaining === 'number') setRemaining(d.remaining)
    },
    [supabase],
  )

  const isLocked = useCallback((adId: string) => status[adId] === 'locked', [status])

  return { limit, remaining, unlimited, noteView, isLocked }
}

export type AdLimit = ReturnType<typeof useAdLimit>
