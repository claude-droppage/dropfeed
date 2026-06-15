'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AuthForm from '@/components/auth/AuthForm'
import { pl } from '@/lib/i18n/pl'

// Dwa stany: (1) brak sesji → wyślij link (AuthForm reset); (2) sesja po kliknięciu
// linku odzyskiwania → ustaw nowe hasło.
export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [recovery, setRecovery] = useState<boolean | null>(null)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setRecovery(!!data.session))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (recovery === null) return <div className="text-text-lo text-sm">…</div>
  if (!recovery) return <AuthForm mode="reset" />

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setDone(true)
    setTimeout(() => { router.push('/feed'); router.refresh() }, 1200)
  }

  const input = 'w-full bg-bg-raised border border-line rounded-xl px-4 py-3 text-text-hi text-sm placeholder:text-text-lo outline-none focus:border-text-mid transition-colors'
  return (
    <div className="w-full max-w-sm">
      <h1 className="text-text-hi text-2xl font-semibold mb-1">{pl.auth.resetTitle}</h1>
      <p className="text-text-mid text-sm mb-6">{pl.auth.setPassword}</p>
      {done ? (
        <p className="text-profit text-sm bg-bg-surface border border-line rounded-xl px-4 py-3">{pl.auth.passwordChanged}</p>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input className={input} type="password" autoComplete="new-password" minLength={6} required
            placeholder={pl.auth.newPassword} value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-[#ff6b6b] text-xs">{error}</p>}
          <button type="submit" disabled={loading}
            className="bg-heat text-[#2A1700] text-sm font-medium py-3 rounded-[999px] hover:brightness-110 disabled:opacity-50 transition-all">
            {loading ? '…' : pl.auth.setPassword}
          </button>
        </form>
      )}
    </div>
  )
}
