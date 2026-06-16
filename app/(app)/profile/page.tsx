import Link from 'next/link'
import { Settings, Flame, Layers, History, ChevronRight, Sparkles, Gauge } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { pl } from '@/lib/i18n/pl'
import SignOutButton from '@/components/auth/SignOutButton'
import { SwipeSpyLogo } from '@/components/SwipeSpyLogo'

const MENU_ITEMS = [
  { icon: Flame, label: pl.profile.niches, sub: 'fitness, beauty, pet' },
  { icon: History, label: pl.profile.history, sub: '' },
  { icon: Settings, label: pl.profile.settings, sub: '' },
]

interface LimitStatus {
  used?: number
  remaining?: number
  limit?: number | null
  unlimited?: boolean
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [{ data: profile }, { data: statusData }] = await Promise.all([
    supabase.from('users').select('plan').eq('id', user!.id).maybeSingle(),
    supabase.rpc('ad_view_status'),
  ])

  const isPro = profile?.plan === 'pro'
  const status = (statusData ?? {}) as LimitStatus
  const limit = status.limit ?? 20
  const remaining = typeof status.remaining === 'number' ? status.remaining : limit
  const counterSub = isPro || status.unlimited
    ? pl.profile.unlimited
    : `${pl.feed.left} ${remaining}/${limit}`

  return (
    <div className="h-full flex flex-col bg-bg-void overflow-y-auto">
      {/* Logo */}
      <div className="px-4 pt-5">
        <SwipeSpyLogo className="text-[1.2rem]" />
      </div>

      {/* Avatar + plan */}
      <div className="flex flex-col items-center pt-6 pb-6 px-4">
        <div className="w-20 h-20 rounded-full bg-bg-raised border border-line flex items-center justify-center mb-3">
          <span className="text-2xl font-medium text-text-mid">{(user?.email?.[0] ?? 'K').toUpperCase()}</span>
        </div>
        <p className="text-text-hi font-medium text-base mb-1.5 truncate max-w-[80%]">{user?.email ?? 'Twój profil'}</p>
        <div className="bg-heat-deep border border-heat/30 rounded-full px-3 py-1 flex items-center gap-1.5">
          <Layers size={11} className="text-heat" />
          <span className="text-[11px] font-medium text-heat">{isPro ? pl.profile.planPro : pl.profile.plan}</span>
        </div>
      </div>

      {/* Licznik dziennego limitu */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-3 bg-bg-surface border border-line rounded-xl px-4 py-3">
          <Gauge size={16} className="text-heat shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-hi">{pl.profile.adsToday}</p>
            <p className="text-[11px] text-text-lo mt-0.5 font-mono">{counterSub}</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="px-4 flex flex-col gap-2 pb-6 pt-2">
        {MENU_ITEMS.map(({ icon: Icon, label, sub }) => (
          <div
            key={label}
            className="flex items-center gap-3 bg-bg-surface border border-line rounded-xl px-4 py-3"
          >
            <Icon size={16} className="text-text-lo shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-hi">{label}</p>
              {sub && <p className="text-[11px] text-text-lo mt-0.5 truncate">{sub}</p>}
            </div>
            <ChevronRight size={14} className="text-text-lo" />
          </div>
        ))}

        {/* Ulepsz do Pro (tylko free) */}
        {!isPro && (
          <Link
            href="/pro"
            className="flex items-center gap-3 bg-heat-deep border border-heat/30 rounded-xl px-4 py-3 hover:border-heat/60 transition-colors"
          >
            <Sparkles size={16} className="text-heat shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-heat font-medium">{pl.profile.upgrade}</p>
            </div>
            <ChevronRight size={14} className="text-heat" />
          </Link>
        )}
      </div>

      {/* Logout */}
      <div className="px-4 pb-10">
        <SignOutButton />
      </div>
    </div>
  )
}
