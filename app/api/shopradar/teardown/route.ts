import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'

// AI teardown najlepszego wideo — Claude (vision na okładce + caption + metryki).
// Gemini-z-wideo = upgrade na później (obecny klucz Gemini nieprawidłowy formatem).
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null) as { productId?: string; region?: string; cover?: string; caption?: string; views?: number; likes?: number; itemId?: string } | null
  if (!b?.cover && !b?.caption) return NextResponse.json({ error: 'bad' }, { status: 400 })
  const admin = createAdminClient()

  // cache hit
  if (b.productId && b.itemId) {
    const { data } = await admin.from('shop_products').select('teardown').eq('product_id', b.productId).eq('region', b.region ?? 'US').maybeSingle()
    if (data?.teardown?.itemId === b.itemId) return NextResponse.json({ teardown: data.teardown, cached: true })
  }

  const blocks: Anthropic.ContentBlockParam[] = []
  if (b.cover) {
    try {
      const r = await fetch(b.cover, { signal: AbortSignal.timeout(15000) })
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer())
        const ct = r.headers.get('content-type') ?? 'image/jpeg'
        const media = (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(ct) ? ct : 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
        blocks.push({ type: 'image', source: { type: 'base64', media_type: media, data: buf.toString('base64') } })
      }
    } catch { /* brak okładki → analiza po samym tekście */ }
  }
  blocks.push({ type: 'text', text: `Jesteś strategiem kreacji reklamowych. Przeanalizuj to wideo TikTok sprzedające produkt (okładka powyżej jeśli jest). Caption: "${b.caption ?? ''}". Metryki: ${b.views ?? 0} wyświetleń, ${b.likes ?? 0} polubień.
Zwróć WYŁĄCZNIE JSON (po polsku): {"hook":"wizualny hook w 1. sekundzie","format":"format kreacji","language":"język mówiony","proof":"niezaprzeczalny dowód/proof","angle":"główny kąt","funnel":"TOF|MOF|BOF","why":"dlaczego to sprzedaje (2-3 zdania)"}` })

  let teardown: Record<string, unknown> | null = null
  try {
    const msg = await anthropic.messages.create({ model: 'claude-haiku-4-5', max_tokens: 1500, messages: [{ role: 'user', content: blocks }] })
    const txt = msg.content.map((c) => (c.type === 'text' ? c.text : '')).join('')
    const j = txt.match(/\{[\s\S]*\}/)
    teardown = JSON.parse(j ? j[0] : txt)
    if (teardown) teardown.itemId = b.itemId
  } catch { return NextResponse.json({ error: 'ai_failed' }, { status: 502 }) }

  if (b.productId) await admin.from('shop_products').update({ teardown }).eq('product_id', b.productId).eq('region', b.region ?? 'US')
  return NextResponse.json({ teardown })
}
