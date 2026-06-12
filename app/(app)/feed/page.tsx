import { getFeedItems } from '@/lib/data/source'
import FeedView from '@/components/feed/FeedView'

export default function FeedPage() {
  const items = getFeedItems()
  return <FeedView items={items} />
}
