import FeedGate from '@/components/feed/FeedGate'

// Feed jest spersonalizowany (seed sesji + preferencje z localStorage), więc
// dane pobiera klient (FeedGate → FeedView → useInfiniteFeed). Strona = shell.
export default function FeedPage() {
  return <FeedGate />
}
