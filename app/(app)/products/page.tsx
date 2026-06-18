import { getWinnerDays, getProductWinnersForDate, getProductWinners } from '@/lib/data/source'
import ProductsView from '@/components/products/ProductsView'

export default async function ProductsPage() {
  const days = await getWinnerDays(7)
  const todayISO = days[0] ?? new Date().toISOString().slice(0, 10)
  const [todayWinners, tail] = await Promise.all([
    days[0] ? getProductWinnersForDate(days[0]) : getProductWinners(10),
    getProductWinners(60),
  ])
  return <ProductsView todayISO={todayISO} daysWithData={days} todayWinners={todayWinners} tail={tail} />
}
