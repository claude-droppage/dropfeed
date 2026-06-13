import { getFeedItems } from '@/lib/data/source'
import FeedGate from '@/components/feed/FeedGate'

export default async function FeedPage() {
  const items = await getFeedItems()
  return <FeedGate serverItems={items} />
}
