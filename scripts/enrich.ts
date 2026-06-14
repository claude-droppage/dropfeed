/**
 * Enrichment surowych reklam (Etap 1, krok 4).
 *
 * Czyta raw_ads (processed=false) → fetch landinga (confidence) → Claude Haiku
 * (Batch API, structured output) klasyfikuje offer_type/niche/angle/hook +
 * nazwę oferty → computeHeatScore → upsert brands/products/ads → processed=true.
 *
 * Idempotentny: deterministyczne UUID (v5) z page_id / ad_archive_id, upsert
 * po id; przetwarza tylko processed=false. Re-run bezpieczny.
 *
 * Uruchamianie:
 *   npm run enrich -- --limit 30      # próbka (walidacja jakości)
 *   npm run enrich                    # wszystkie processed=false
 *
 * Sekrety z .env.local (server-side): ANTHROPIC_API_KEY, SUPABASE_SERVICE_ROLE_KEY.
 *
 * UWAGA: creative_url/thumb_url to tymczasowo URL-e Meta (wygasają) — krok 5
 * przerzuci kreacje na R2. Kraje w payloadzie są puste → euCountriesCount=0
 * (heat traci komponent geo 10%), poprawi się przy szerszym scrapingu.
 */

import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { computeHeatScore } from '../lib/heat.ts'
import type { OfferType, Niche, AdAngle, AdFormat } from '../lib/types.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ─── env ───────────────────────────────────────────────────────────────────
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  try {
    for (const line of readFileSync(resolve(root, '.env.local'), 'utf8').split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq === -1) continue
      env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim()
    }
  } catch { /* brak pliku */ }
  return env
}
const env = { ...loadEnv(), ...process.env }
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY
const ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY
if (!SUPABASE_URL || !SERVICE_ROLE) { console.error('✗ Brak konfiguracji Supabase w .env.local'); process.exit(1) }
if (!ANTHROPIC_API_KEY) { console.error('✗ Brak ANTHROPIC_API_KEY w .env.local'); process.exit(1) }

const limitArg = process.argv.indexOf('--limit')
const LIMIT = limitArg !== -1 ? parseInt(process.argv[limitArg + 1], 10) : Infinity

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

// ─── deterministyczne UUID v5 ────────────────────────────────────────────────
const NS = 'b8c0f4e2-1a3d-4f7b-9c2e-6d5a8f0b1c3d'
function uuidv5(name: string): string {
  const h = createHash('sha1')
    .update(Buffer.from(NS.replace(/-/g, ''), 'hex'))
    .update(Buffer.from(name, 'utf8'))
    .digest()
  const b = h.subarray(0, 16)
  b[6] = (b[6] & 0x0f) | 0x50
  b[8] = (b[8] & 0x3f) | 0x80
  const x = b.toString('hex')
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`
}

// ─── typy enumów (do schematu structured output) ─────────────────────────────
const OFFER_TYPES: OfferType[] = ['physical', 'digital', 'app', 'service', 'course', 'other']
const NICHES: Niche[] = ['beauty', 'kitchen', 'pet', 'fitness', 'gadgets', 'home', 'fashion', 'health', 'tech', 'education', 'other']
const ANGLES: AdAngle[] = ['ugc', 'demo', 'problem-solution', 'testimonial', 'lifestyle', 'comparison', 'other']

interface Classification {
  offer_type: OfferType
  niche: Niche
  angle: AdAngle
  offer_name: string
  category: string
  hook: string
  confidence: number
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    offer_type: { type: 'string', enum: OFFER_TYPES },
    niche: { type: 'string', enum: NICHES },
    angle: { type: 'string', enum: ANGLES },
    offer_name: { type: 'string' },
    category: { type: 'string' },
    hook: { type: 'string' },
    confidence: { type: 'number' },
  },
  required: ['offer_type', 'niche', 'angle', 'offer_name', 'category', 'hook', 'confidence'],
}

const SYSTEM = `Jesteś klasyfikatorem reklam z Meta Ad Library dla narzędzia ad-spy.
Na podstawie danych reklamy (tekst, marka, landing) zwróć JSON:
- offer_type: typ oferty (physical=produkt fizyczny, digital=produkt cyfrowy/pdf, app=aplikacja, service=usługa, course=kurs, other).
- niche: nisza z listy.
- angle: kąt kreacji (ugc, demo, problem-solution, testimonial, lifestyle, comparison, other).
- offer_name: krótka nazwa konkretnej oferty/produktu (nie marki). Po polsku jeśli reklama jest po polsku.
- category: kategoria oferty (np. "skincare tools", "suplementy").
- hook: główny hook reklamy w 1 zdaniu (cytuj/parafrazuj z treści).
- confidence: 0–1, Twoja pewność co do nazwy oferty (wysoka gdy landing/treść jasno ją wskazują, niska gdy zgadujesz).
Odpowiadaj WYŁĄCZNIE zgodnie ze schematem.`

// ─── landing fetch (tytuł + opis → wsparcie confidence) ───────────────────────
async function fetchLanding(url: string | undefined): Promise<string> {
  if (!url || !/^https?:\/\//.test(url)) return ''
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 6000)
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 dropfeed-enrich' } })
    clearTimeout(t)
    if (!res.ok) return ''
    const html = (await res.text()).slice(0, 200_000)
    const pick = (re: RegExp) => (html.match(re)?.[1] ?? '').trim()
    const title = pick(/<title[^>]*>([^<]+)<\/title>/i)
    const ogTitle = pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    const ogDesc = pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)
    const desc = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    return [ogTitle || title, ogDesc || desc].filter(Boolean).join(' — ').slice(0, 500)
  } catch {
    return ''
  }
}

async function mapPool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++
        out[idx] = await fn(items[idx])
      }
    }),
  )
  return out
}

// ─── pomocnicze: wyciąganie pól z payloadu ───────────────────────────────────
type Json = Record<string, unknown>
const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined)
function snapshotText(s: Json): { body: string; title: string; cta: string; linkDesc: string; landingUrl?: string } {
  const body = typeof s.body === 'string' ? s.body : str((s.body as Json)?.text) ?? ''
  return {
    body: body ?? '',
    title: str(s.title) ?? '',
    cta: str(s.cta_text) ?? '',
    linkDesc: str(s.link_description) ?? '',
    landingUrl: str(s.link_url),
  }
}
function creativeUrls(s: Json): { format: AdFormat; creativeUrl: string; thumbUrl: string } {
  const videos = (s.videos as Json[]) ?? []
  const images = (s.images as Json[]) ?? []
  const cards = (s.cards as Json[]) ?? []
  if (videos.length) {
    const v = videos[0]
    return {
      format: 'video',
      creativeUrl: str(v.video_hd_url) ?? str(v.video_sd_url) ?? str(v.video_preview_image_url) ?? '',
      thumbUrl: str(v.video_preview_image_url) ?? '',
    }
  }
  const img = images[0] ?? (cards[0] as Json)
  const url = str(img?.original_image_url) ?? str(img?.resized_image_url) ?? str(img?.video_preview_image_url) ?? ''
  return { format: 'image', creativeUrl: url, thumbUrl: url }
}

const NOW_S = Math.floor(Date.now() / 1000)
function ageInDays(startUnix: number | undefined): number {
  if (!startUnix) return 0
  return Math.max(0, Math.floor((NOW_S - startUnix) / 86400))
}

interface RawRow { ad_archive_id: string; payload: Json }

async function main() {
  console.log(`Enrichment → ${SUPABASE_URL}${LIMIT !== Infinity ? `  (limit ${LIMIT})` : ''}`)

  // 1) Wszystkie raw_ads (do agregatów per marka) + zbiór do enrichmentu (processed=false)
  const { data: allRows, error: e1 } = await supabase.from('raw_ads').select('ad_archive_id,payload')
  if (e1) { console.error('✗ raw_ads:', e1.message); process.exit(1) }
  const all = allRows as RawRow[]

  // agregaty per page_id: liczba reklam marki + nowe warianty w 14 dni
  const brandTotal = new Map<string, number>()
  const brandNew14 = new Map<string, number>()
  for (const r of all) {
    const pid = str((r.payload.snapshot as Json)?.page_id) ?? str(r.payload.page_id)
    if (!pid) continue
    brandTotal.set(pid, (brandTotal.get(pid) ?? 0) + 1)
    const age = ageInDays(Number(r.payload.start_date) || undefined)
    if (age <= 14) brandNew14.set(pid, (brandNew14.get(pid) ?? 0) + 1)
  }

  const { data: todoRows, error: e2 } = await supabase
    .from('raw_ads').select('ad_archive_id,payload').eq('processed', false)
    .limit(LIMIT === Infinity ? 100000 : LIMIT)
  if (e2) { console.error('✗ raw_ads(todo):', e2.message); process.exit(1) }
  const todo = todoRows as RawRow[]
  if (!todo.length) { console.log('Brak rekordów processed=false — nic do roboty.'); return }
  console.log(`Do enrichmentu: ${todo.length}`)

  // 2) Landing fetch (równolegle)
  console.log('Pobieranie landingów…')
  const landings = await mapPool(todo, 10, async (r) => fetchLanding(snapshotText(r.payload.snapshot as Json).landingUrl))

  // 3) Batch do Claude Haiku
  console.log('Wysyłanie batcha do Claude Haiku…')
  const requests = todo.map((r, i) => {
    const s = r.payload.snapshot as Json
    const t = snapshotText(s)
    const ad = [
      `Marka: ${str(s.page_name) ?? '?'}`,
      `Tytuł: ${t.title}`,
      `Treść: ${t.body}`,
      `CTA: ${t.cta}`,
      `Opis linku: ${t.linkDesc}`,
      `Landing: ${landings[i] || '(brak)'}`,
    ].join('\n')
    return {
      custom_id: r.ad_archive_id,
      params: {
        model: 'claude-haiku-4-5',
        max_tokens: 512,
        thinking: { type: 'disabled' as const },
        system: SYSTEM,
        output_config: { format: { type: 'json_schema' as const, schema: SCHEMA } },
        messages: [{ role: 'user' as const, content: ad }],
      },
    }
  })

  // @ts-expect-error output_config/thinking pełne typy SDK pomijam — kształt zgodny z API
  const batch = await anthropic.messages.batches.create({ requests })
  console.log(`Batch ${batch.id} (${batch.processing_status})…`)
  let done = batch
  while (done.processing_status !== 'ended') {
    await new Promise((r) => setTimeout(r, 5000))
    done = await anthropic.messages.batches.retrieve(batch.id)
    process.stdout.write(`\r  status: ${done.processing_status} · ok:${done.request_counts.succeeded} err:${done.request_counts.errored}   `)
  }
  console.log('')

  // 4) Zbierz wyniki
  const cls = new Map<string, Classification>()
  let parseErr = 0
  for await (const res of await anthropic.messages.batches.results(batch.id)) {
    if (res.result.type !== 'succeeded') { parseErr++; continue }
    const block = res.result.message.content.find((b) => b.type === 'text')
    if (!block || block.type !== 'text') { parseErr++; continue }
    try {
      cls.set(res.custom_id, JSON.parse(block.text) as Classification)
    } catch { parseErr++ }
  }
  console.log(`Sklasyfikowano: ${cls.size}, błędy: ${parseErr}`)

  // 5) Kandydaci z policzonym heat (heat nie zależy od Haiku — z payloadu)
  const PER_BRAND_CAP = 10
  interface Cand {
    r: RawRow; c: Classification; pid: string; brandId: string
    heat: number; age: number; isActive: boolean; countries: string[]; total: number; new14: number
  }
  const cands: Cand[] = []
  const processedIds: string[] = [] // wszystkie sklasyfikowane (włączone + odcięte capem)
  for (const r of todo) {
    const c = cls.get(r.ad_archive_id)
    if (!c) continue
    processedIds.push(r.ad_archive_id)
    const s = r.payload.snapshot as Json
    const pid = str(s.page_id) ?? str(r.payload.page_id)
    if (!pid) continue
    const age = ageInDays(Number(r.payload.start_date) || undefined)
    const isActive = String(r.payload.is_active).toLowerCase() === 'true'
    const countries = Array.isArray(r.payload.targeted_or_reached_countries)
      ? (r.payload.targeted_or_reached_countries as string[]) : []
    const total = brandTotal.get(pid) ?? 1
    const new14 = brandNew14.get(pid) ?? 0
    const heat = computeHeatScore({
      ageInDays: age, newVariantsLast14Days: new14, totalVariants: total,
      euCountriesCount: countries.length, isActive, scalingSince: undefined,
    })
    cands.push({ r, c, pid, brandId: uuidv5('brand:' + pid), heat, age, isActive, countries, total, new14 })
  }

  // Obecne liczby reklam/markę (limit 10 w bazie)
  const brandIds = [...new Set(cands.map((x) => x.brandId))]
  const existing = new Map<string, number>()
  for (let i = 0; i < brandIds.length; i += 300) {
    const { data, error } = await supabase.from('ads').select('brand_id').in('brand_id', brandIds.slice(i, i + 300))
    if (error) { console.error('✗ count brand_id:', error.message); process.exit(1) }
    for (const row of data as { brand_id: string }[]) existing.set(row.brand_id, (existing.get(row.brand_id) ?? 0) + 1)
  }

  // 6) Mapowanie → brands / products / ads (top po heat, max 10/markę)
  cands.sort((a, b) => b.heat - a.heat)
  const perBrand = new Map(existing)
  const brands = new Map<string, Record<string, unknown>>()
  const products = new Map<string, Record<string, unknown>>()
  const adRows: Record<string, unknown>[] = []
  const nowIso = new Date().toISOString()
  let capped = 0

  for (const x of cands) {
    if ((perBrand.get(x.brandId) ?? 0) >= PER_BRAND_CAP) { capped++; continue }
    perBrand.set(x.brandId, (perBrand.get(x.brandId) ?? 0) + 1)

    const { r, c, pid, brandId, heat, age, isActive, countries, total, new14 } = x
    const s = r.payload.snapshot as Json
    const t = snapshotText(s)
    const media = creativeUrls(s)
    const conf = Math.max(0, Math.min(1, Number(c.confidence) || 0))
    const startUnix = Number(r.payload.start_date) || undefined

    // brand
    if (!brands.has(brandId)) {
      const name = str(s.page_name) ?? str(r.payload.page_name) ?? 'Marka'
      const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || name.slice(0, 2).toUpperCase()
      brands.set(brandId, {
        id: brandId,
        name,
        fb_page_id: pid,
        ig_handle: null,
        ig_followers: Number(s.page_like_count) || null,
        store_url: t.landingUrl ? new URL(t.landingUrl).origin : null,
        country: countries[0] ?? null,
        avatar_initials: initials,
      })
    }

    // product (dedup po marce + nazwie oferty)
    const offerName = (c.offer_name || 'Oferta').trim()
    const productId = uuidv5('product:' + pid + ':' + offerName.toLowerCase())
    if (!products.has(productId)) {
      products.set(productId, {
        id: productId,
        brand_id: brandId,
        name: offerName,
        offer_type: c.offer_type,
        niche: c.niche,
        category: c.category || 'inne',
        price_in_store: null,
        offer_url: t.landingUrl ?? null,
        thumbnail: media.thumbUrl || null,
        confidence: conf,
      })
    }

    // ad
    adRows.push({
      id: uuidv5('ad:' + r.ad_archive_id),
      ad_archive_id: r.ad_archive_id,
      brand_id: brandId,
      product_id: productId,
      format: media.format,
      creative_url: media.creativeUrl || (t.landingUrl ?? 'https://picsum.photos/seed/' + r.ad_archive_id + '/360/640'),
      thumb_url: media.thumbUrl || null,
      angle: c.angle,
      hook: c.hook || t.title || null,
      copy: t.body || null,
      cta: t.cta || null,
      start_date: str((r.payload.start_date_formatted as string))?.slice(0, 10) ?? new Date((startUnix ?? NOW_S) * 1000).toISOString().slice(0, 10),
      is_active: isActive,
      countries,
      heat_score: heat,
      ad_variants_count: total,
      scaling_since: null,
      offer_type: c.offer_type,
      confidence: conf,
      age_in_days: age,
      new_variants_last_14_days: new14,
      last_seen_at: nowIso,
    })
  }

  // 7) Upsert w kolejności FK
  async function up(table: string, rows: unknown[]) {
    if (!rows.length) return
    const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' })
    if (error) { console.error(`✗ ${table}: ${error.message}`); process.exit(1) }
    console.log(`✓ ${table}: ${rows.length}`)
  }
  await up('brands', [...brands.values()])
  await up('products', [...products.values()])
  await up('ads', adRows)

  // 7) Oznacz przetworzone
  if (processedIds.length) {
    const { error } = await supabase.from('raw_ads')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .in('ad_archive_id', processedIds)
    if (error) { console.error('✗ raw_ads update:', error.message); process.exit(1) }
  }
  console.log(`\n✓ Gotowe. Reklam: ${adRows.length}, marek: ${brands.size}, produktów: ${products.size}, odcięte limitem 10/markę: ${capped}, oznaczonych processed: ${processedIds.length}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
