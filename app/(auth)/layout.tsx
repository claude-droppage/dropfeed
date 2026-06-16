import { SwipeSpyLogo } from '@/components/SwipeSpyLogo'

// Trasy auth renderujemy dynamicznie — bez statycznego prerenderu w buildzie.
// AuthForm/reset tworzą klienta Supabase przy renderze; prerender wykonałby to
// w czasie builda (na Vercelu brak env → createBrowserClient rzuca → build fail).
export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-bg-void px-5 py-10">
      <div className="mb-8">
        <SwipeSpyLogo className="text-[1.6rem]" />
      </div>
      {children}
    </div>
  )
}
