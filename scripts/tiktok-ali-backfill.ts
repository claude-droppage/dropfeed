/**
 * Jednorazowy backfill ali_query dla istniejących sprzedawców TikTok — POPRAWNIE:
 * keyword z captionu NAJLEPSZEGO FILMIKU (nie top-produktu sklepu), oczyszczony Haiku.
 * Caption nie nazywa produktu → ali_query = null (chip AliExpress znika).
 * Uruchamianie: node scripts/tiktok-ali-backfill.ts
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const env: Record<string, string> = {}
for (const l of readFileSync(resolve(root, '.env.local'), 'utf8').split('\n')) { const t = l.trim(); if (!t || t.startsWith('#')) continue; const e = t.indexOf('='); if (e > 0) env[t.slice(0, e).trim()] = t.slice(e + 1).trim() }
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY! })
const TOKEN = env.APIFY_TOKEN!

/** Haiku: z captionów wyciąga generyczną nazwę produktu (EN, bez marki/hype) lub ''. */
async function extractQueries(items: { i: number; caption: string }[]): Promise<Map<number, string>> {
  const out = new Map<number, string>()
  if (!items.length) return out
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5', max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Z każdego opisu filmiku TikTok wyciągnij FIZYCZNY produkt sprzedawany w filmie jako krótką GENERYCZNĄ angielską frazę do wyszukania na AliExpress (2-5 słów). BEZ nazw marek, BEZ hype, BEZ hashtagów. Jeśli opis nie nazywa wyraźnie fizycznego produktu, zwróć "".
Zwróć WYŁĄCZNIE JSON: [{"i":<numer>,"q":"<fraza lub pusty string>"}]

${JSON.stringify(items)}`,
    }],
  })
  const txt = msg.content.map((c) => (c.type === 'text' ? c.text : '')).join('').replace(/```json|```/g, '').trim()
  try { for (const r of JSON.parse(txt) as { i: number; q: string }[]) out.set(r.i, (r.q || '').trim()) } catch { console.error('✗ parse Haiku:', txt.slice(0, 200)) }
  return out
}

async function main() {
  const { data } = await supabase.from('tiktok_organic_sellers').select('handle, best_video_url').not('best_video_url', 'is', null)
  const sellers = (data as { handle: string; best_video_url: string }[]) ?? []
  console.log(`Sprzedawców: ${sellers.length}`)

  // 1) captiony najlepszych filmików (clockworks postURLs)
  const body = JSON.stringify({ postURLs: sellers.map((s) => s.best_video_url), resultsPerPage: 1, shouldDownloadVideos: false, shouldDownloadCovers: false, shouldDownloadSubtitles: false })
  const r = await fetch(`https://api.apify.com/v2/acts/clockworks~tiktok-scraper/run-sync-get-dataset-items?token=${TOKEN}&timeout=300`, { method: 'POST', headers: { 'content-type': 'application/json' }, body })
  const items = await r.json() as Record<string, unknown>[]
  const capByHandle = new Map<string, string>()
  for (const it of (Array.isArray(items) ? items : [])) {
    const am = (it.authorMeta ?? {}) as Record<string, unknown>
    const handle = String(am.name ?? '')
    const tags = Array.isArray(it.hashtags) ? (it.hashtags as { name?: string }[]).map((h) => h.name).filter(Boolean).join(' ') : ''
    if (handle) capByHandle.set(handle, `${String(it.text ?? '')} ${tags}`.trim())
  }
  console.log(`Captionów dociągniętych: ${capByHandle.size}`)

  // 2) Haiku → keyword
  const list = sellers.map((s, i) => ({ i, caption: capByHandle.get(s.handle) ?? '' }))
  const queries = await extractQueries(list)

  // 3) update (pusty → null, chip znika)
  let set = 0, cleared = 0
  for (let i = 0; i < sellers.length; i++) {
    const q = (queries.get(i) ?? '').trim()
    await supabase.from('tiktok_organic_sellers').update({ ali_query: q || null }).eq('handle', sellers[i].handle)
    if (q) { set++; console.log(`  @${sellers[i].handle} → "${q}"  ←  ${(capByHandle.get(sellers[i].handle) ?? '').slice(0, 50)}`) }
    else cleared++
  }
  console.log(`\nUstawione: ${set} | wyczyszczone (brak produktu w opisie): ${cleared}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
