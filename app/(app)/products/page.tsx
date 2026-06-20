import { getWinnerDays, getProductWinnersForDate, getTikTokSellers } from '@/lib/data/source'
import ProductsView from '@/components/products/ProductsView'

export default async function ProductsPage() {
  const realTodayISO = new Date().toISOString().slice(0, 10) // UTC „dziś" = kotwica + domyślny wybór
  const [days, todayWinners, sellers] = await Promise.all([
    getWinnerDays(7),                                  // [{day, thumb}] malejąco (do miniatur kalendarza)
    getProductWinnersForDate(realTodayISO),            // zwycięzcy DZIŚ (pusto → uczciwy stan)
    getTikTokSellers(60),                              // organiczni sprzedawcy TikTok (osobna zakładka)
  ])
  return <ProductsView realTodayISO={realTodayISO} days={days} todayWinners={todayWinners} sellers={sellers} />
}
