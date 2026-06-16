import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Landing from '@/components/landing/Landing'

export const metadata: Metadata = {
  title: 'dropfeed — winnery, które scrollujesz jak TikToka',
  description:
    'Reklamy, które realnie sprzedają — w feedzie, który wciąga zamiast męczyć. Scrollujesz winnery jak TikToka. 20 reklam dziennie za darmo.',
}

// "/" jest publiczny: niezalogowany widzi landing, zalogowany → feed.
// Sprawdzenie server-side (cookies) — niezależne od proxy.
export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/feed')
  return <Landing />
}
