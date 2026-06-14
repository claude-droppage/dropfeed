// ════════════════════════════════════════════════════════════════════════
// Edge Function: ingest — odbiera webhook Apify (RUN.SUCCEEDED), dociąga
// dataset z Apify API i robi upsert do raw_ads (dedup po ad_archive_id).
//
// Model PUSH: Apify Schedule → webhook (tylko metadane runu) → ta funkcja
// pobiera itemy datasetu z Apify API. Webhook nie niesie danych (bywają duże).
//
// Auth: współdzielony sekret w nagłówku x-webhook-secret (lub ?secret=).
// Zapis przez service_role (Supabase wstrzykuje SUPABASE_SERVICE_ROLE_KEY —
// omija RLS). Deploy z verify_jwt=false (Apify nie wysyła JWT Supabase).
// ════════════════════════════════════════════════════════════════════════

import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APIFY_TOKEN = Deno.env.get('APIFY_TOKEN')!
const WEBHOOK_SECRET = Deno.env.get('INGEST_WEBHOOK_SECRET')!

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

/** Dociąga wszystkie itemy datasetu Apify (stronicowanie po offset/limit). */
async function fetchAllItems(datasetId: string): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = []
  const limit = 1000
  for (let offset = 0; ; offset += limit) {
    const url =
      `https://api.apify.com/v2/datasets/${datasetId}/items` +
      `?token=${APIFY_TOKEN}&clean=true&format=json&offset=${offset}&limit=${limit}`
    const res = await fetch(url)
    if (!res.ok) {
      throw new Error(`Apify dataset fetch ${res.status}: ${await res.text()}`)
    }
    const page = (await res.json()) as Record<string, unknown>[]
    out.push(...page)
    if (page.length < limit) break
  }
  return out
}

function chunk<T>(arr: T[], size: number): T[][] {
  const res: T[][] = []
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size))
  return res
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  // ─── Auth: współdzielony sekret ──────────────────────────────────────────
  const provided =
    req.headers.get('x-webhook-secret') ??
    new URL(req.url).searchParams.get('secret')
  if (!WEBHOOK_SECRET || provided !== WEBHOOK_SECRET) {
    return json({ error: 'unauthorized' }, 401)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'bad json' }, 400)
  }

  // ─── Payload webhooka Apify ──────────────────────────────────────────────
  const eventType = body.eventType as string | undefined
  // Apify może wysłać test/inne eventy — przetwarzamy tylko sukces runu.
  if (eventType && eventType !== 'ACTOR.RUN.SUCCEEDED') {
    return json({ skipped: eventType }, 200)
  }
  const resource = (body.resource ?? {}) as Record<string, unknown>
  const datasetId =
    (resource.defaultDatasetId as string | undefined) ??
    (body.datasetId as string | undefined)
  if (!datasetId) return json({ error: 'no datasetId in payload' }, 400)

  // ─── Pobranie + mapowanie + dedup w obrębie batcha ───────────────────────
  const items = await fetchAllItems(datasetId)
  const seen = new Set<string>()
  const rows: { ad_archive_id: string; source: string; payload: unknown }[] = []
  let skippedNoId = 0
  for (const it of items) {
    const id = it.ad_archive_id
    if (typeof id !== 'string' || !id) {
      skippedNoId++
      continue
    }
    if (seen.has(id)) continue
    seen.add(id)
    rows.push({ ad_archive_id: id, source: 'meta_ad_library', payload: it })
  }

  // ─── Upsert do raw_ads (dedup między runami po ad_archive_id) ─────────────
  // onConflict: aktualizuje source + payload; scraped_at/processed zostają
  // (nie resetujemy processed, by nie wymuszać ponownego enrichmentu).
  for (const part of chunk(rows, 500)) {
    const { error } = await supabase
      .from('raw_ads')
      .upsert(part, { onConflict: 'ad_archive_id' })
    if (error) return json({ error: error.message }, 500)
  }

  return json({ datasetId, received: items.length, upserted: rows.length, skippedNoId })
})
