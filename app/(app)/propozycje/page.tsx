import { getPropozycje } from '@/lib/data/source'
import PropozycjeView from '@/components/propozycje/PropozycjeView'

export default async function PropozycjePage() {
  const data = await getPropozycje()
  return <PropozycjeView data={data} />
}
