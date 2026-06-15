'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { pl } from '@/lib/i18n/pl'

export default function SignOutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={signOut}
      className="w-full flex items-center gap-3 bg-bg-surface border border-line rounded-xl px-4 py-3 hover:border-text-mid transition-colors"
    >
      <LogOut size={16} className="text-text-lo shrink-0" />
      <span className="text-sm text-text-mid">{pl.auth.logout}</span>
    </button>
  )
}
