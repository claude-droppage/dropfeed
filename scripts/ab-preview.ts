/**
 * A/B PODGLĄD (Perełki v1) — TYLKO wydruk, NIC nie zapisuje, NIE rusza live'a (dni 18/19, feed).
 * Ta sama pula → STARY scoring (product_winners) obok NOWEGO gem_score (fb_cluster_gems),
 * + jak gem_score przetasowałby feed vs obecny shuffle. Decyzja o przełączeniu = osobno, po zielonym.
 *
 * Uruchamianie: npm run ab:preview [-- --aggro 0.6 --seed 123]
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  try { for (const line of readFileSync(resolve(root, '.env.local'), 'utf8').split('\n')) { const t = line.trim(); if (!t || t.startsWith('#')) continue; const e = t.indexOf('='); if (e > 0) env[t.slice(0, e).trim()] = t.slice(e + 1).trim() } } catch { /* CI */ }
  return env
}
const env = { ...loadEnv(), ...process.env }
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i !== -1 ? process.argv[i + 1] : d }
const AGGRO = Number(arg('--aggro', '0.6'))
const SEED = Number(arg('--seed', '123'))
const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n))

async function main() {
  console.log(`\n══ A/B PODGLĄD (aggro=${AGGRO}, seed=${SEED}) — NIC nie zapisane, live nietknięty ══\n`)

  // 1) WINNERZY: stary product_winners vs nowy gem_score (klaster)
  const { data: oldW } = await supabase.rpc('product_winners', { p_limit: 10, p_country: null, p_tiered: true, p_dedup_window: false })
  const { data: newG } = await supabase.rpc('fb_cluster_gems', { p_limit: 10, p_aggro: AGGRO })
  const o = (oldW as Record<string, unknown>[]) ?? []
  const g = (newG as Record<string, unknown>[]) ?? []
  console.log('TOP-10 PRODUKTY:  STARY (product_winners)            │  NOWY (gem_score klastra)')
  console.log('─'.repeat(96))
  for (let i = 0; i < 10; i++) {
    const ol = o[i] ? `${pad(String(o[i].name ?? ''), 34)} ${String(o[i].tier ?? '')}` : ''
    const gl = g[i] ? `${pad(String(g[i].rep_name ?? ''), 30)} s=${g[i].gem_score} (sel ${g[i].n_sellers}/new ${g[i].new_ads_7d})` : ''
    console.log(`  ${String(i + 1).padStart(2)}. ${pad(ol, 44)} │  ${gl}`)
  }

  // 2) FEED: obecny shuffle vs reorder po gem_score klastra (ta sama 15-ka)
  const { data: feed } = await supabase.rpc('feed_shuffle', { p_offset: 0, p_limit: 15, p_seed: SEED, p_offer_types: null, p_min_age_days: 7 })
  const rows = (feed as Record<string, unknown>[]) ?? []
  const { data: allG } = await supabase.rpc('fb_cluster_gems', { p_limit: 600, p_aggro: AGGRO })
  const gemByCluster = new Map<number, number>((allG as Record<string, unknown>[]).map((c) => [c.cluster_id as number, c.gem_score as number]))
  const sample = rows.map((r) => {
    const prod = r.product as Record<string, unknown> | null
    return { name: String(prod?.name ?? r.product_id ?? '?'), cid: (r as Record<string, unknown>).cluster_id as number, gem: gemByCluster.get((r as Record<string, unknown>).cluster_id as number) ?? 0 }
  })
  const reordered = [...sample].sort((a, b) => b.gem - a.gem)
  console.log('\nFEED (ta sama 15-ka):  OBECNY SHUFFLE                  │  REORDER wg gem_score')
  console.log('─'.repeat(96))
  for (let i = 0; i < sample.length; i++) {
    const cur = `${pad(sample[i].name, 34)}`
    const re = `${pad(reordered[i].name, 30)} s=${reordered[i].gem}`
    console.log(`  ${String(i + 1).padStart(2)}. ${pad(cur, 40)} │  ${re}`)
  }
  console.log('\n(Podgląd. Przełączenie live = osobny krok po Twoim OK.)')
}
main().catch((e) => { console.error(e); process.exit(1) })
