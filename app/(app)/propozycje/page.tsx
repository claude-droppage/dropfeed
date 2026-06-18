import { getPropozycje, getProductWinners } from '@/lib/data/source'
import PropozycjeView from '@/components/propozycje/PropozycjeView'

export default async function PropozycjePage() {
  const [data, adsWinners] = await Promise.all([
    getPropozycje(),
    getProductWinners(15, 'PL', true, true), // Reklamy·PL = zwycięzcy PL, bez powtórek z okna 7 dni
  ])
  return <PropozycjeView data={data} adsWinners={adsWinners} />
}
