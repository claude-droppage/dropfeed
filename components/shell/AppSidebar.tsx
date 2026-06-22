'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles, Flame, Package, Store, Bookmark, User, Radar } from 'lucide-react'
import { SwipeSpyLogo } from '@/components/SwipeSpyLogo'
import { pl } from '@/lib/i18n/pl'

const NAV = [
  { href: '/propozycje', label: pl.nav.propozycje, Icon: Sparkles },
  { href: '/feed', label: pl.nav.feed, Icon: Flame },
  { href: '/products', label: pl.nav.products, Icon: Package },
  { href: '/shop', label: pl.nav.shop, Icon: Store },
  { href: '/shopradar', label: 'ShopRadar', Icon: Radar },
  { href: '/boards', label: pl.nav.boards, Icon: Bookmark },
  { href: '/profile', label: pl.nav.profile, Icon: User },
] as const

// Filtry na teraz wizualne (silnik odkrywania = osobny krok). Patrz CLAUDE.md.
const SIGNALS = ['Momentum (rośnie)', 'Nowe na rynku', 'Wygrywa za granicą', 'Najwyższy heat']
const NICHES = ['Wszystkie', 'Beauty', 'Tech / gadżety', 'Dom']

export default function AppSidebar({ className = '' }: { className?: string }) {
  const path = usePathname()
  return (
    <aside className={`w-[236px] shrink-0 h-dvh overflow-y-auto bg-bg-surface border-r border-line flex-col gap-6 p-4 ${className}`}>
      <Link href="/feed" className="px-1.5">
        <SwipeSpyLogo className="text-[1.3rem]" />
      </Link>

      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, Icon }) => {
          const active = path === href || path.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[9px] text-sm font-medium transition-colors ${
                active ? 'bg-heat/10 text-heat' : 'text-text-mid hover:bg-bg-raised hover:text-text-hi'
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.4 : 1.9} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="flex flex-col gap-3.5 mt-1">
        <FilterGroup title="Sygnał" options={SIGNALS} />
        <FilterGroup title="Nisza" options={NICHES} />
      </div>

      <Link
        href="/profile"
        className="mt-auto flex items-center gap-2.5 p-2 rounded-[9px] border border-line hover:border-text-mid transition-colors"
      >
        <span className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-heat to-[#f5c46d] shrink-0" />
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold text-text-hi leading-tight">Twoje konto</span>
          <span className="block text-[11px] text-text-lo leading-tight">Profil</span>
        </span>
      </Link>
    </aside>
  )
}

function FilterGroup({ title, options }: { title: string; options: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-1.5 text-[11px] font-semibold tracking-[0.07em] uppercase text-text-lo">{title}</p>
      {options.map((o, i) => (
        <span
          key={o}
          className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] cursor-default ${
            i === 0 ? 'text-text-hi' : 'text-text-mid'
          }`}
        >
          <span className={`w-[7px] h-[7px] rounded-full ${i === 0 ? 'bg-heat' : 'bg-text-lo'}`} />
          {o}
        </span>
      ))}
    </div>
  )
}
