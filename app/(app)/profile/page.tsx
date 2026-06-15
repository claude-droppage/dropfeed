import { Settings, Flame, Layers, History, ChevronRight } from 'lucide-react'
import { pl } from '@/lib/i18n/pl'
import SignOutButton from '@/components/auth/SignOutButton'

const MENU_ITEMS = [
  { icon: Flame, label: pl.profile.niches, sub: 'fitness, beauty, pet' },
  { icon: History, label: pl.profile.history, sub: '0 swipe\'ów dziś' },
  { icon: Settings, label: pl.profile.settings, sub: '' },
]

export default function ProfilePage() {
  return (
    <div className="h-full flex flex-col bg-bg-void overflow-y-auto">
      {/* Avatar + plan */}
      <div className="flex flex-col items-center pt-10 pb-6 px-4">
        <div className="w-20 h-20 rounded-full bg-bg-raised border border-line flex items-center justify-center mb-3">
          <span className="text-2xl font-medium text-text-mid">K</span>
        </div>
        <p className="text-text-hi font-medium text-base mb-1.5">Twój profil</p>
        <div className="bg-heat-deep border border-heat/30 rounded-full px-3 py-1 flex items-center gap-1.5">
          <Layers size={11} className="text-heat" />
          <span className="text-[11px] font-medium text-heat">{pl.profile.plan}</span>
        </div>
      </div>

      {/* Menu */}
      <div className="px-4 flex flex-col gap-2 pb-6">
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
      </div>

      {/* Logout */}
      <div className="px-4 pb-10">
        <SignOutButton />
      </div>
    </div>
  )
}
