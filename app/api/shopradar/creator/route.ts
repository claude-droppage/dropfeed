import { NextRequest, NextResponse } from 'next/server'
import { getCreator } from '@/lib/scrapecreators'
import { createAdminClient } from '@/lib/supabase/admin'

// Profil twórcy. Cache w shop_creators (7 dni).
export async function GET(req: NextRequest) {
  const handle = (req.nextUrl.searchParams.get('handle') ?? '').replace(/^@/, '')
  if (!handle) return NextResponse.json({ creator: null })
  const admin = createAdminClient()
  const { data: cached } = await admin.from('shop_creators').select('*').eq('handle', handle).maybeSingle()
  if (cached && new Date(cached.fetched_at).getTime() > Date.now() - 7 * 86400000) {
    return NextResponse.json({ creator: { handle: cached.handle, nickname: cached.nickname, followers: cached.followers, likes: cached.likes, videoCount: cached.video_count, verified: false, avatar: cached.avatar, bio: cached.raw?.bio, bioLink: cached.raw?.bioLink, email: cached.email } })
  }
  const creator = await getCreator(handle)
  if (creator) {
    await admin.from('shop_creators').upsert({
      handle: creator.handle, nickname: creator.nickname, followers: creator.followers, likes: creator.likes,
      video_count: creator.videoCount, email: creator.email ?? null, avatar: creator.avatar ?? null,
      raw: { bio: creator.bio, bioLink: creator.bioLink, verified: creator.verified }, fetched_at: new Date().toISOString(),
    }, { onConflict: 'handle' })
  }
  return NextResponse.json({ creator })
}
