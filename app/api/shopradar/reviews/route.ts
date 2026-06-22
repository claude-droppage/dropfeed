import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getProductReviews } from '@/lib/scrapecreators'
import { createAdminClient } from '@/lib/supabase/admin'

// Recenzje → kąty reklamowe. Scrape (paginacja ~100) → Claude → insights. Cache w reviews_cache.
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null) as { productId?: string; region?: string } | null
  if (!b?.productId) return NextResponse.json({ error: 'bad' }, { status: 400 })
  const region = b.region ?? 'US'
  const admin = createAdminClient()

  const { data: hit } = await admin.from('shop_products').select('reviews_cache').eq('product_id', b.productId).eq('region', region).maybeSingle()
  if (hit?.reviews_cache) return NextResponse.json({ ...hit.reviews_cache, cached: true })

  const { reviews, total, overall } = await getProductReviews(b.productId, region, 100)
  if (!reviews.length) return NextResponse.json({ error: 'no_reviews' }, { status: 404 })

  const verifiedPct = Math.round(reviews.filter((r) => r.verified).length / reviews.length * 100)
  const usPct = Math.round(reviews.filter((r) => r.country === 'US').length / reviews.length * 100)
  const breakdown = [5, 4, 3, 2, 1].map((s) => ({ stars: s, n: reviews.filter((r) => Math.round(r.rating) === s).length }))
  const sample = reviews.filter((r) => r.text.trim()).slice(0, 80).map((r) => `[${r.rating}★] ${r.text}`)

  let analysis: Record<string, unknown> | null = null
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5', max_tokens: 2000,
      messages: [{ role: 'user', content: `Jesteś strategiem reklamowym. Oto recenzje produktu z TikTok Shop. Zwróć WYŁĄCZNIE JSON (po polsku):
{"summary":"2-3 zdania","complaints":[{"point":"...","quote":"cytat z recenzji"}],"loves":[{"point":"...","quote":"cytat"}],"whyBuy":["..."],"questions":["..."],"voc":["frazy klienta (voice-of-customer)"],"angles":["rekomendowane kąty reklamowe"]}
Recenzje:
${sample.join('\n')}` }],
    })
    const txt = msg.content.map((c) => (c.type === 'text' ? c.text : '')).join('').replace(/```json|```/g, '').trim()
    analysis = JSON.parse(txt)
  } catch { return NextResponse.json({ error: 'ai_failed' }, { status: 502 }) }

  const payload = { analysis, total, overall, sampled: reviews.length, verifiedPct, usPct, breakdown }
  await admin.from('shop_products').update({ reviews_cache: payload }).eq('product_id', b.productId).eq('region', region)
  return NextResponse.json(payload)
}
