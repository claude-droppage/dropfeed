import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Marki użytkownika (Brand Bible). user-scoped przez RLS.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ brands: [] })
  const { data } = await supabase.from('shop_brands').select('*').order('created_at', { ascending: false })
  return NextResponse.json({ brands: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 })
  const b = await req.json().catch(() => null) as { id?: string; name?: string; bible?: string; brief_template?: string; products?: unknown } | null
  if (!b?.name) return NextResponse.json({ error: 'bad' }, { status: 400 })
  const row = { ...(b.id ? { id: b.id } : {}), user_id: user.id, name: b.name, bible: b.bible ?? null, brief_template: b.brief_template ?? null, products: b.products ?? [] }
  const { data, error } = await supabase.from('shop_brands').upsert(row).select().single()
  return NextResponse.json({ brand: data, error: error?.message })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 })
  const id = req.nextUrl.searchParams.get('id')
  if (id) await supabase.from('shop_brands').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
