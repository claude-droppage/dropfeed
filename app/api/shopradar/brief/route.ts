import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Generator briefu kreatywnego: brief DLA MOJEJ marki/produktu, inspirowany
// produktem konkurencji (teardown + recenzje jako inspiracja, NIGDY pod konkurenta).
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 })
  const b = await req.json().catch(() => null) as { brandId?: string; myProduct?: string; competitorProductId?: string; region?: string } | null
  if (!b?.brandId || !b?.competitorProductId) return NextResponse.json({ error: 'bad' }, { status: 400 })

  const { data: brand } = await supabase.from('shop_brands').select('*').eq('id', b.brandId).maybeSingle()
  if (!brand) return NextResponse.json({ error: 'no_brand' }, { status: 404 })

  const admin = createAdminClient()
  const { data: comp } = await admin.from('shop_products').select('title, teardown, reviews_cache').eq('product_id', b.competitorProductId).eq('region', b.region ?? 'US').maybeSingle()

  const ctx = [
    `MARKA: ${brand.name}`,
    brand.bible ? `BRAND BIBLE: ${brand.bible}` : '',
    b.myProduct ? `MÓJ PRODUKT: ${b.myProduct}` : (brand.products?.[0] ? `MÓJ PRODUKT: ${JSON.stringify(brand.products[0])}` : ''),
    comp?.title ? `KONKURENT (inspiracja): ${comp.title}` : '',
    comp?.teardown ? `TEARDOWN WYGRYWAJĄCEGO WIDEO KONKURENTA: ${JSON.stringify(comp.teardown)}` : '',
    comp?.reviews_cache?.analysis ? `INSIGHTY Z RECENZJI KONKURENTA: ${JSON.stringify(comp.reviews_cache.analysis)}` : '',
    brand.brief_template ? `SZABLON BRIEFU: ${brand.brief_template}` : '',
  ].filter(Boolean).join('\n\n')

  let content = ''
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5', max_tokens: 2500,
      messages: [{ role: 'user', content: `Jesteś senior strategiem kreacji reklamowych TikTok. Napisz BRIEF KREATYWNY reklamy TikTok DLA PRODUKTU MOJEJ MARKI (po polsku). Produkt konkurencji, jego teardown i recenzje to TYLKO INSPIRACJA — NIGDY nie pisz reklamy dla konkurenta. Brief ma zawierać: nagłówek, grupę docelową, główny kąt, hook (1. sekunda), strukturę scenariusza (sceny), proof/dowód, CTA, i rekomendowany format. Konkret, gotowe do produkcji.

${ctx}` }],
    })
    content = msg.content.map((c) => (c.type === 'text' ? c.text : '')).join('').trim()
  } catch { return NextResponse.json({ error: 'ai_failed' }, { status: 502 }) }

  const { data: saved } = await supabase.from('shop_briefs').insert({
    user_id: user.id, brand_id: b.brandId, title: `${brand.name} — brief`, competitor_product_id: b.competitorProductId, content,
  }).select().single()
  return NextResponse.json({ brief: saved })
}
