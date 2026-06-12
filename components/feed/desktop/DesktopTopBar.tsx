'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { pl } from '@/lib/i18n/pl'

const NAV = [
  { href: '/feed',     label: pl.nav.feed },
  { href: '/boards',   label: pl.nav.boards },
  { href: '/discover', label: pl.nav.discover },
  { href: '/profile',  label: pl.nav.profile },
] as const

export default function DesktopTopBar() {
  const path = usePathname()

  return (
    <div className="flex items-center gap-6 px-6 py-3.5 border-b border-line bg-bg-void shrink-0">
      {/* Logo */}
      <span className="font-mono text-[15px] font-medium tracking-[0.5px] shrink-0">
        dropfeed<span className="text-heat">_</span>
      </span>

      {/* Search placeholder */}
      <div className="flex-1 max-w-sm bg-bg-surface border border-line rounded-[999px] px-4 py-2 text-[13px] text-text-lo select-none">
        ⌕&nbsp; szukaj produktu, marki, niszy…
      </div>

      {/* Nav */}
      <nav className="flex items-center gap-5 ml-auto">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`text-[13px] transition-colors ${
              path === href
                ? 'text-text-hi font-medium'
                : 'text-text-lo hover:text-text-mid'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
