// ════════════════════════════════════════════════════════════════════════
// Edge Function: shop-enrich — on-demand wzbogacenie produktu TikTok Shop (T3b).
// (1) twarde dane: pro100chok scrapeType=product (exactSoldCount, soldLast30Days,
//     shopVideoCount, firstLiveTime, dane sklepu)
// (2) powiązane wideo (v0): clockworks search po SMART query (sklep/marka + typ
//     z tytułu, NIE cały tytuł) → statystyki do tiktok_shop_video
// Cache ~2 tyg (detail_fetched_at / videos_fetched_at). Best-effort: każdy krok
// w try/catch, zapis tylko po sukcesie. Vercel BEZ sekretów — Apify żyje tu.
// Deploy z verify_jwt=true (tylko zalogowani odpalają płatny Apify).
// ════════════════════════════════════════════════════════════════════════

import { createClient } from 'jsr:@supabase/supabase-js@2'

const APIFY = Deno.env.get('APIFY_TOKEN')!
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const STALE_MS = 14 * 24 * 3600 * 1000

// CORS — funkcja wołana z przeglądarki (supabase.functions.invoke z deep-dive)
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'content-type': 'application/json' } })
const toInt = (x: unknown) => { const n = parseInt(String(x ?? '').replace(/[^0-9]/g, ''), 10); return Number.isFinite(n) ? n : null }
const toNum = (x: unknown) => { const n = Number(x); return Number.isFinite(n) ? n : null }

function smartQuery(title: string | null, seller: string | null): string {
  const t = (title || '').replace(/[[\]【】()|]/g, ' ').replace(/[^A-Za-z0-9 ]/g, ' ')
  const words = t.split(/\s+/).filter((w) => w.length > 2).slice(0, 4).join(' ')
  return [seller, words].filter(Boolean).join(' ').trim().slice(0, 60) || (title || '').slice(0, 40)
}

const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

// tokeny trafności: marka (sellerName) + wyróżniające słowa z tytułu (≥4 znaki)
function relevanceTokens(title: string | null, seller: string | null): string[] {
  const toks = new Set<string>()
  const st = norm(seller || '')
  if (st.length >= 3) toks.add(st)
  ;(title || '').replace(/[[\]【】()|]/g, ' ').replace(/[^A-Za-z0-9 ]/g, ' ').toLowerCase()
    .split(/\s+/).filter((w) => w.length >= 4).slice(0, 3).forEach((w) => toks.add(w))
  return [...toks]
}

function isRelevant(v: Record<string, unknown>, tokens: string[]): boolean {
  if (!tokens.length) return true
  const hashtags = (v.hashtags as { name?: string }[] | undefined) || []
  const hay = norm(String(v.text ?? '') + ' ' + hashtags.map((h) => h?.name ?? '').join(' '))
  return tokens.some((t) => hay.includes(t))
}

const mapVideo = (productId: string) => (v: Record<string, unknown>) => {
  const author = v.authorMeta as Record<string, unknown> | undefined
  const meta = v.videoMeta as Record<string, unknown> | undefined
  return {
    product_id: productId, video_id: String(v.id), url: (v.webVideoUrl as string) ?? null,
    cover_url: (meta?.coverUrl as string) ?? null, caption: String(v.text ?? '').slice(0, 300),
    author: (author?.name as string) ?? null, author_avatar: (author?.avatar as string) ?? null,
    author_followers: toInt(author?.fans),
    views: toInt(v.playCount), likes: toInt(v.diggCount), comments: toInt(v.commentCount), shares: toInt(v.shareCount),
    created_at: (v.createTimeISO as string) ?? null, fetched_at: new Date().toISOString(),
  }
}

async function apifyRunSync(act: string, input: unknown, ms = 70000): Promise<Record<string, unknown>[] | null> {
  const ctrl = new AbortController()
  const to = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(`https://api.apify.com/v2/acts/${act}/run-sync-get-dataset-items?token=${APIFY}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input), signal: ctrl.signal,
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(to)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)
  const { productId } = await req.json().catch(() => ({}))
  if (!productId) return json({ error: 'productId required' }, 400)

  const { data: p } = await supabase.from('tiktok_shop_products').select('*').eq('product_id', productId).maybeSingle()
  if (!p) return json({ error: 'not found' }, 404)
  const now = Date.now()

  // (1) twarde dane produktu — best-effort
  if (p.product_url && (!p.detail_fetched_at || now - Date.parse(p.detail_fetched_at) > STALE_MS)) {
    const det = await apifyRunSync('pro100chok~tiktok-shop-scraper-usage', { scrapeType: 'product', productUrls: [p.product_url], region: 'us' })
    const d = Array.isArray(det) && det[0] ? det[0] : null
    if (d) {
      await supabase.from('tiktok_shop_products').update({
        exact_sold_count: toInt(d.exactSoldCount), sold_last_30: toInt(d.soldLast30Days),
        shop_video_count: toInt(d.shopVideoCount), first_live_time: (d.firstLiveTime as string) ?? null,
        shop_name: (d.sellerName as string) ?? null, shop_followers: toInt(d.shopFollowers),
        shop_total_sold: toInt(d.shopTotalSold), shop_url: (d.shopUrl as string) ?? null,
        shop_rating: toNum(d.shopRating), detail_fetched_at: new Date().toISOString(),
      }).eq('product_id', productId)
    }
  }

  // (2) powiązane wideo (v0) — smart-search + profil sprzedawcy, filtr trafności
  if (!p.videos_fetched_at || now - Date.parse(p.videos_fetched_at) > STALE_MS) {
    const q = smartQuery(p.title as string, p.seller_name as string)
    const seller = (p.seller_name as string) || ''
    const [bySearch, byProfile] = await Promise.all([
      apifyRunSync('clockworks~tiktok-scraper', { searchQueries: [q], resultsPerPage: 8, searchSection: '/video' }),
      seller ? apifyRunSync('clockworks~tiktok-scraper', { profiles: [seller], resultsPerPage: 8 }) : Promise.resolve([]),
    ])
    if (Array.isArray(bySearch) || Array.isArray(byProfile)) {
      const raw = [...(Array.isArray(bySearch) ? bySearch : []), ...(Array.isArray(byProfile) ? byProfile : [])]
      const tokens = relevanceTokens(p.title as string, seller)
      const seen = new Set<string>()
      const rows = raw
        .filter((v) => { const id = String(v?.id ?? ''); if (!id || seen.has(id)) return false; seen.add(id); return true })
        .filter((v) => (toInt(v.playCount) ?? 0) >= 100)   // odrzuć bardzo niskie
        .filter((v) => isRelevant(v, tokens))              // filtr trafności (opis/hashtagi ~ marka/tytuł)
        .map(mapVideo(productId))
        .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
        .slice(0, 8)
      // świeży zestaw trafnych zastępuje poprzedni (delete-all + insert)
      await supabase.from('tiktok_shop_video').delete().eq('product_id', productId)
      if (rows.length) await supabase.from('tiktok_shop_video').insert(rows)
      await supabase.from('tiktok_shop_products').update({ videos_fetched_at: new Date().toISOString() }).eq('product_id', productId)
    }
  }

  const { data: product } = await supabase.from('tiktok_shop_products').select('*').eq('product_id', productId).maybeSingle()
  const { data: videos } = await supabase.from('tiktok_shop_video').select('*').eq('product_id', productId).order('views', { ascending: false }).limit(8)
  return json({ product, videos: videos ?? [] })
})
