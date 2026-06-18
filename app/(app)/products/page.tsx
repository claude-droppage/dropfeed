import { getWinnerDays, getProductWinnersForDate, getProductWinners } from '@/lib/data/source'
import ProductsView from '@/components/products/ProductsView'

export default async function ProductsPage() {
  const realTodayISO = new Date().toISOString().slice(0, 10) // UTC „dziś" — kotwica okna
  const days = await getWinnerDays(7) // [{day, thumb}] malejąco
  const newest = days[0]?.day ?? realTodayISO
  const [todayWinners, tail] = await Promise.all([
    getProductWinnersForDate(newest),
    getProductWinners(60, undefined, false, false), // ogon = pełna lista rise-first (bez dedup okna)
  ])
  return <ProductsView realTodayISO={realTodayISO} days={days} newestDay={newest} todayWinners={todayWinners} tail={tail} />
}
