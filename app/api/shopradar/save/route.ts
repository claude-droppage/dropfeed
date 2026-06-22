import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Zapis produktu/wideo do shop_saved (user-scoped, RLS). Faza 6 wyświetli listę.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauth' }, { status: 401 })
  const b = await req.json().catch(() => null) as { kind?: string; ref_id?: string; region?: string; meta?: unknown } | null
  if (!b?.kind || !b?.ref_id) return NextResponse.json({ error: 'bad' }, { status: 400 })
  const { error } = await supabase.from('shop_saved').upsert(
    { user_id: user.id, kind: b.kind, ref_id: b.ref_id, region: b.region ?? null, meta: b.meta ?? null },
    { onConflict: 'user_id,kind,ref_id' },
  )
  return NextResponse.json({ ok: !error })
}
