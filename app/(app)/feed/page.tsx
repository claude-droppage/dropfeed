import { getFeedItems } from '@/lib/data/source'
import FeedGate from '@/components/feed/FeedGate'

export default function FeedPage() {
  const items = getFeedItems()
  return <FeedGate serverItems={items} />
}
