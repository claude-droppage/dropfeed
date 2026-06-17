'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Flame, Package, Store, Bookmark, User } from 'lucide-react'
import { pl } from '@/lib/i18n/pl'

const links = [
  { href: '/feed',     label: pl.nav.feed,     Icon: Flame },
  { href: '/products', label: pl.nav.products, Icon: Package },
  { href: '/shop',     label: pl.nav.shop,     Icon: Store },
  { href: '/boards',   label: pl.nav.boards,   Icon: Bookmark },
  { href: '/profile',  label: pl.nav.profile,  Icon: User },
] as const

export default function BottomNav() {
  const path = usePathname()

  return (
    <nav className="flex items-stretch border-t border-line bg-bg-void shrink-0 z-50">
      {links.map(({ href, label, Icon }) => {
        const active = path === href || path.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 px-1"
          >
            <Icon
              size={18}
              strokeWidth={active ? 2.5 : 1.75}
              className={active ? 'text-heat' : 'text-text-lo'}
            />
            <span
              className={`text-[10px] leading-none font-medium ${
                active ? 'text-heat' : 'text-text-lo'
              }`}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
