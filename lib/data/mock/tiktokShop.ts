// Mock TikTok Shop. US = live (realne liczby sprzedaży — zieleń), PL = fresh
// (świeży rynek od 15.06, first-mover + pierwsze ruchy). Treść poglądowa.
// Zasada (CLAUDE.md): TikTok Shop real sales TAK, estymaty SimilarWeb NIE.
import type { ShopMarket, TikTokShopResult, TikTokShopItem } from '@/lib/types'

const US: TikTokShopItem[] = [
  { rank: 1, name: '40oz Insulated Tumbler', emoji: '🥤', sold: '14,2 tys.', trend: '▲ 32%' },
  { rank: 2, name: 'LED Face Mask Therapy', emoji: '💡', sold: '8,7 tys.', trend: '▲ 18%' },
  { rank: 3, name: 'Mini Waffle Maker', emoji: '🧇', sold: '6,1 tys.', trend: '▲ 9%' },
  { rank: 4, name: 'Hair Growth Serum', emoji: '🧴', sold: '5,4 tys.', trend: '▲ 21%' },
  { rank: 5, name: 'Compression Socks 3-pack', emoji: '🧦', sold: '4,8 tys.', trend: '▲ 6%' },
]

const PL_FIRST_MOVES: TikTokShopItem[] = [
  { rank: 1, name: 'beBIO Cosmetics — krem', emoji: '🧴', sold: '312', trend: 'nowy' },
  { rank: 2, name: 'Carpatree — legginsy', emoji: '💪', sold: '204', trend: 'nowy' },
]

export async function getTikTokShop(market: ShopMarket): Promise<TikTokShopResult> {
  if (market === 'US') {
    return { market: 'US', state: 'live', items: US }
  }
  return { market: 'PL', state: 'fresh', items: [], firstMoves: PL_FIRST_MOVES }
}
