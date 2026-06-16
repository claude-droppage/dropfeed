import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/ui/BottomNav'

// TWARDY gate server-side: każdy render tras (app) sprawdza sesję na serwerze
// (cookies → render dynamiczny, brak statycznego cache CDN). Niezależne od proxy.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex flex-col h-dvh bg-bg-void">
      <main className="flex-1 relative min-h-0">{children}</main>
      {/* BottomNav only on mobile — desktop has its own top bar */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  )
}
