'use client'

import { useState } from 'react'
import { Package, Cpu, Sparkles, Compass, Check, ArrowRight } from 'lucide-react'
import {
  INTENT_CONFIG,
  ONBOARDING_NICHES,
  savePreferences,
  type IntentKey,
} from '@/lib/preferences'

const ONBOARDED_COOKIE = 'dropfeed_onboarded=1; path=/; max-age=31536000; SameSite=Strict'
const INTENT_ORDER: IntentKey[] = ['physical', 'digital', 'inspirations', 'any']

const INTENT_ICON: Record<IntentKey, React.ReactNode> = {
  physical:     <Package size={20} />,
  digital:      <Cpu size={20} />,
  inspirations: <Sparkles size={20} />,
  any:          <Compass size={20} />,
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [intent, setIntent] = useState<IntentKey | null>(null)
  const [niches, setNiches] = useState<string[]>([])

  const goNext = () => setStep(1)
  const toggleNiche = (key: string) =>
    setNiches((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )

  const finish = () => {
    if (!intent) return
    const cfg = INTENT_CONFIG[intent]
    savePreferences({ intent, niches, feedMode: cfg.feedMode, offerTypes: cfg.offerTypes })
    document.cookie = ONBOARDED_COOKIE
    window.location.replace('/feed')
  }

  return (
    <div className="h-dvh bg-bg-void flex flex-col overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-6 pt-12 pb-2 shrink-0 flex items-center justify-between">
        <p className="font-mono text-[15px] font-medium tracking-[.5px] text-text-hi">
          dropfeed<span className="text-heat">_</span>
        </p>
        <div className="flex gap-1.5 items-center">
          <div
            className="h-[3px] rounded-full transition-all duration-300"
            style={{ width: step === 0 ? 20 : 12, background: '#EF9F27' }}
          />
          <div
            className="h-[3px] rounded-full transition-all duration-300"
            style={{ width: step === 1 ? 20 : 12, background: step >= 1 ? '#EF9F27' : '#26262C' }}
          />
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col px-6 pt-8 pb-0 overflow-y-auto">

        {step === 0 ? (
          <>
            <h1 className="text-[26px] font-bold text-text-hi tracking-tight leading-tight mb-2">
              Czego szukasz?
            </h1>
            <p className="text-text-lo text-sm mb-8 leading-relaxed">
              Dopasujemy feed do Twoich celów
            </p>

            <div className="flex flex-col gap-3">
              {INTENT_ORDER.map((intentKey) => {
                const cfg = INTENT_CONFIG[intentKey]
                const active = intent === intentKey
                return (
                  <button
                    key={intentKey}
                    type="button"
                    onClick={() => setIntent(intentKey)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      padding: 16,
                      borderRadius: 16,
                      border: `1.5px solid ${active ? '#EF9F27' : '#26262C'}`,
                      background: active ? '#2A1400' : '#15151A',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'border-color 150ms, background 150ms',
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: active ? 'rgba(239,159,39,0.15)' : '#1C1C22',
                      color: active ? '#EF9F27' : '#6E6E76',
                    }}>
                      {INTENT_ICON[intentKey]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: active ? '#EF9F27' : '#F2F2F0', marginBottom: 2, lineHeight: 1.3 }}>
                        {cfg.label}
                      </p>
                      <p style={{ fontSize: 12, color: '#6E6E76', lineHeight: 1.4 }}>
                        {cfg.sub}
                      </p>
                    </div>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      border: `1.5px solid ${active ? '#EF9F27' : '#26262C'}`,
                      background: active ? '#EF9F27' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {active && <Check size={10} strokeWidth={3} color="#2A1700" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <h1 className="text-[26px] font-bold text-text-hi tracking-tight leading-tight mb-2">
              Twoje nisze
            </h1>
            <p className="text-text-lo text-sm mb-6 leading-relaxed">
              Wybierz kilka — pojawią się częściej w feedzie
            </p>

            <div className="flex flex-wrap gap-2.5">
              {ONBOARDING_NICHES.map(({ key, label }) => {
                const active = niches.includes(key)
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleNiche(key)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '10px 16px',
                      borderRadius: 999,
                      border: `1.5px solid ${active ? '#EF9F27' : '#26262C'}`,
                      background: active ? '#2A1400' : '#15151A',
                      color: active ? '#EF9F27' : '#9C9CA4',
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'border-color 150ms, background 150ms, color 150ms',
                    }}
                  >
                    {active && <Check size={11} strokeWidth={3} />}
                    {label}
                  </button>
                )
              })}
            </div>
          </>
        )}

        <div className="shrink-0 h-32" />
      </div>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <div className="shrink-0 px-6 pb-10 pt-4" style={{ background: 'linear-gradient(to top, #0B0B0E 70%, transparent)' }}>
        {step === 0 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!intent}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '15px 0',
              borderRadius: 16,
              background: intent ? '#EF9F27' : '#EF9F2740',
              color: '#2A1700',
              fontSize: 15,
              fontWeight: 700,
              border: 'none',
              cursor: intent ? 'pointer' : 'default',
              transition: 'background 150ms',
            }}
          >
            Dalej <ArrowRight size={18} />
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={finish}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '15px 0',
                borderRadius: 16,
                background: '#EF9F27',
                color: '#2A1700',
                fontSize: 15,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Zacznij przeglądać <ArrowRight size={18} />
            </button>
            <button
              type="button"
              onClick={finish}
              style={{ width: '100%', background: 'transparent', border: 'none', color: '#6E6E76', fontSize: 12, cursor: 'pointer', padding: '4px 0' }}
            >
              pomiń — wybiorę później
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
