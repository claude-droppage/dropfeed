'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { pl } from '@/lib/i18n/pl'

type Mode = 'login' | 'register' | 'reset'

const COPY: Record<Mode, { title: string; sub: string; submit: string }> = {
  login: { title: pl.auth.loginTitle, sub: pl.auth.loginSub, submit: pl.auth.login },
  register: { title: pl.auth.registerTitle, sub: pl.auth.registerSub, submit: pl.auth.register },
  reset: { title: pl.auth.resetTitle, sub: pl.auth.resetSub, submit: pl.auth.sendReset },
}

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/feed')
        router.refresh()
      } else if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${location.origin}/auth/callback` },
        })
        if (error) throw error
        // dev: mailer_autoconfirm → sesja od razu; proxy poprowadzi na onboarding
        router.push('/feed')
        router.refresh()
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/auth/callback?next=/reset-password`,
        })
        if (error) throw error
        setSent(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : pl.auth.genericError)
    } finally {
      setLoading(false)
    }
  }

  async function google() {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
    if (error) setError(error.message)
  }

  const copy = COPY[mode]
  const input = 'w-full bg-bg-raised border border-line rounded-xl px-4 py-3 text-text-hi text-sm placeholder:text-text-lo outline-none focus:border-text-mid transition-colors'

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-text-hi text-2xl font-semibold mb-1">{copy.title}</h1>
      <p className="text-text-mid text-sm mb-6">{copy.sub}</p>

      {sent ? (
        <p className="text-profit text-sm bg-bg-surface border border-line rounded-xl px-4 py-3">{pl.auth.resetSent}</p>
      ) : (
        <>
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <input className={input} type="email" inputMode="email" autoComplete="email"
              placeholder={pl.auth.email} value={email} onChange={(e) => setEmail(e.target.value)} required />
            {mode !== 'reset' && (
              <input className={input} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder={pl.auth.password} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            )}
            {error && <p className="text-[#ff6b6b] text-xs">{error}</p>}
            <button type="submit" disabled={loading}
              className="bg-heat text-[#2A1700] text-sm font-medium py-3 rounded-[999px] hover:brightness-110 disabled:opacity-50 transition-all">
              {loading ? '…' : copy.submit}
            </button>
          </form>

          {mode !== 'reset' && (
            <>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-line" />
                <span className="text-text-lo text-xs">{pl.auth.or}</span>
                <div className="flex-1 h-px bg-line" />
              </div>
              <button onClick={google} type="button"
                className="w-full flex items-center justify-center gap-2 bg-bg-surface border border-line text-text-hi text-sm py-3 rounded-[999px] hover:border-text-mid transition-colors">
                <GoogleIcon /> {pl.auth.google}
              </button>
              {/* TODO Apple: brak Apple Developer — slot wyłączony, zero implementacji */}
              <button type="button" disabled aria-disabled
                className="w-full flex items-center justify-center gap-2 bg-bg-surface border border-line text-text-lo text-sm py-3 rounded-[999px] mt-2 opacity-40 cursor-not-allowed">
                 {pl.auth.apple} <span className="text-[10px]">({pl.auth.appleSoon})</span>
              </button>
            </>
          )}

          <div className="text-center text-xs text-text-mid mt-6 flex flex-col gap-1.5">
            {mode === 'login' && (
              <>
                <span>{pl.auth.noAccount} <Link href="/register" className="text-heat">{pl.auth.toRegister}</Link></span>
                <Link href="/reset-password" className="text-text-lo">{pl.auth.forgot}</Link>
              </>
            )}
            {mode === 'register' && (
              <span>{pl.auth.haveAccount} <Link href="/login" className="text-heat">{pl.auth.toLogin}</Link></span>
            )}
            {mode === 'reset' && (
              <Link href="/login" className="text-heat">{pl.auth.toLogin}</Link>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.27-4.74 3.27-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  )
}
