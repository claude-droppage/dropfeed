import { getFeedPage } from '@/lib/data/source'
import { FEED_PAGE_SIZE } from '@/lib/types'
import FeedGate from '@/components/feed/FeedGate'

export default async function FeedPage() {
  // tylko 1. strona dla szybkiego pierwszego paintu; resztę doładowuje klient
  const { items } = await getFeedPage({ offset: 0, limit: FEED_PAGE_SIZE })
  return <FeedGate serverItems={items} />
}
