import { createClient } from '@/lib/supabase/server'
import { INTENT_CONFIG, type IntentKey } from '@/lib/preferences'
import type { Niche } from '@/lib/types'
import FeedView from '@/components/feed/FeedView'

// Preferencje feedu żyją na koncie (intent + selected_niches). Strona pobiera je
// server-side i derywuje feedMode/offerTypes z INTENT_CONFIG. Sam feed (dane)
// dociąga klient przez FeedView → useInfiniteFeed.
export default async function FeedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('users')
    .select('intent, selected_niches, plan')
    .eq('id', user!.id)
    .maybeSingle()

  const intent = (profile?.intent ?? 'any') as IntentKey
  const cfg = INTENT_CONFIG[intent] ?? INTENT_CONFIG.any

  // Free = feed zablokowany na dzień: seed stały per user+dzień (UTC) → refresh = ten sam
  // zestaw cały dzień, nowy jutro. Pro = świeże co refresh (seed losowany w FeedView).
  // Default = free (aktywuje się samo, gdy pojawią się konta pro; Stripe/auth nietknięte).
  const isPro = profile?.plan === 'pro'
  const dayKey = `${user!.id}:${new Date().toISOString().slice(0, 10)}`
  let daySeed = 0
  for (let i = 0; i < dayKey.length; i++) daySeed = (daySeed * 31 + dayKey.charCodeAt(i)) | 0
  daySeed = Math.abs(daySeed)

  return (
    <FeedView
      initialMode={cfg.feedMode}
      initialOfferTypes={cfg.offerTypes}
      initialNiches={(profile?.selected_niches ?? []) as Niche[]}
      isPro={isPro}
      daySeed={daySeed}
    />
  )
}
