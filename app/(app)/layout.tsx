import BottomNav from '@/components/ui/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
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
