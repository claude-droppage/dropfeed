import { getPropozycje, getProductWinners } from '@/lib/data/source'
import PropozycjeView from '@/components/propozycje/PropozycjeView'

export default async function PropozycjePage() {
  const [data, adsWinners] = await Promise.all([
    getPropozycje(),
    getProductWinners(15, 'PL'), // pod-feed Reklamy·PL = zwycięzcy z reklam (PL)
  ])
  return <PropozycjeView data={data} adsWinners={adsWinners} />
}
