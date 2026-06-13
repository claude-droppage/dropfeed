'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
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
    router.replace('/feed')
  }

  return (
    <div className="h-dvh bg-bg-void flex flex-col overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="px-6 pt-12 pb-2 shrink-0 flex items-center justify-between">
        <p className="font-mono text-[15px] font-medium tracking-[.5px] text-text-hi">
          dropfeed<span className="text-heat">_</span>
        </p>
        <div className="flex gap-1.5 items-center">
          <div className={`h-[3px] rounded-full transition-all duration-300 ${step === 0 ? 'w-5 bg-heat' : 'w-3 bg-heat/60'}`} />
          <div className={`h-[3px] rounded-full transition-all duration-300 ${step === 1 ? 'w-5 bg-heat' : 'w-3 bg-line'}`} />
        </div>
      </div>

      {/* ── Content (scrollable) ────────────────────────────────── */}
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
              {INTENT_ORDER.map((key) => {
                const cfg = INTENT_CONFIG[key]
                const active = intent === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIntent(key)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border text-left w-full transition-all duration-150 ${
                      active
                        ? 'bg-heat-deep border-heat/50'
                        : 'bg-bg-surface border-line active:bg-bg-raised'
                    }`}
                  >
                    {/* icon */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        active ? 'bg-heat/20 text-heat' : 'bg-bg-raised text-text-lo'
                      }`}
                    >
                      {INTENT_ICON[key]}
                    </div>

                    {/* text */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold mb-0.5 ${active ? 'text-heat' : 'text-text-hi'}`}>
                        {cfg.label}
                      </p>
                      <p className="text-xs text-text-lo leading-snug">{cfg.sub}</p>
                    </div>

                    {/* radio */}
                    <div
                      className={`w-5 h-5 rounded-full border shrink-0 flex items-center justify-center transition-all ${
                        active ? 'bg-heat border-heat' : 'border-line'
                      }`}
                    >
                      {active && <Check size={10} strokeWidth={3} className="text-bg-void" />}
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
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full border text-sm transition-all duration-150 ${
                      active
                        ? 'bg-heat-deep border-heat/50 text-heat font-medium'
                        : 'bg-bg-surface border-line text-text-mid active:bg-bg-raised'
                    }`}
                  >
                    {active && <Check size={11} strokeWidth={3} />}
                    {label}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* spacer so content doesn't hide behind CTA */}
        <div className="shrink-0 h-32" />
      </div>

      {/* ── CTA (sticky bottom) ─────────────────────────────────── */}
      <div className="shrink-0 px-6 pb-10 pt-4 bg-gradient-to-t from-bg-void via-bg-void/95 to-transparent">
        {step === 0 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!intent}
            className="w-full flex items-center justify-center gap-2 bg-heat text-[#2A1700] font-bold text-[15px] py-[15px] rounded-2xl disabled:opacity-25 transition-opacity active:scale-[.98]"
          >
            Dalej <ArrowRight size={18} />
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={finish}
              className="w-full flex items-center justify-center gap-2 bg-heat text-[#2A1700] font-bold text-[15px] py-[15px] rounded-2xl active:scale-[.98] transition-transform"
            >
              Zacznij przeglądać <ArrowRight size={18} />
            </button>
            <button
              type="button"
              onClick={finish}
              className="w-full text-center text-text-lo text-xs py-1"
            >
              pomiń — wybiorę później
            </button>
          </div>
        )}
      </div>

    </div>
  )
}
