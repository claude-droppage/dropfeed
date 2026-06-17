import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/ui/BottomNav'
import AppSidebar from '@/components/shell/AppSidebar'

// TWARDY gate server-side: każdy render tras (app) sprawdza sesję na serwerze
// (cookies → render dynamiczny, brak statycznego cache CDN). Niezależne od proxy.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // onboarding na koncie: kto nie przeszedł → /onboarding (poza grupą (app))
  const { data: profile } = await supabase
    .from('users')
    .select('onboarded')
    .eq('id', user.id)
    .maybeSingle()
  if (!profile?.onboarded) redirect('/onboarding')

  return (
    <div className="h-dvh flex bg-bg-void">
      {/* Desktop: globalny sidebar nawigacji + filtrów */}
      <AppSidebar className="hidden md:flex" />
      {/* Kolumna treści: main + (mobile) dolne taby */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <main className="flex-1 relative min-h-0">{children}</main>
        <div className="md:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  )
}
