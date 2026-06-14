import { getFeedPage } from '@/lib/data/source'
import { FEED_PAGE_SIZE } from '@/lib/types'
import FeedGate from '@/components/feed/FeedGate'

// ISR: strona 1 odświeża się co godzinę (bez redeployu); reszta i tak doładowuje
// się na żywo po stronie klienta (infinite scroll).
export const revalidate = 3600

export default async function FeedPage() {
  // tylko 1. strona dla szybkiego pierwszego paintu; resztę doładowuje klient
  const { items } = await getFeedPage({ offset: 0, limit: FEED_PAGE_SIZE })
  return <FeedGate serverItems={items} />
}
