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
    .select('intent, selected_niches')
    .eq('id', user!.id)
    .maybeSingle()

  const intent = (profile?.intent ?? 'any') as IntentKey
  const cfg = INTENT_CONFIG[intent] ?? INTENT_CONFIG.any

  return (
    <FeedView
      initialMode={cfg.feedMode}
      initialOfferTypes={cfg.offerTypes}
      initialNiches={(profile?.selected_niches ?? []) as Niche[]}
    />
  )
}
