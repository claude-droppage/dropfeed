import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ briefs: [] })
  const { data } = await supabase.from('shop_briefs').select('*').order('created_at', { ascending: false })
  return NextResponse.json({ briefs: data ?? [] })
}
