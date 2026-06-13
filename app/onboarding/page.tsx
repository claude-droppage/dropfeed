'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import {
  INTENT_CONFIG,
  ONBOARDING_NICHES,
  savePreferences,
  type IntentKey,
} from '@/lib/preferences'

const INTENT_ORDER: IntentKey[] = ['physical', 'digital', 'inspirations', 'any']

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? '100%' : '-100%',
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? '-100%' : '100%',
    opacity: 0,
  }),
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [intent, setIntent] = useState<IntentKey | null>(null)
  const [niches, setNiches] = useState<string[]>([])

  const goNext = () => {
    setDir(1)
    setStep(1)
  }

  const toggleNiche = (key: string) => {
    setNiches((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )
  }

  const finish = () => {
    if (!intent) return
    const cfg = INTENT_CONFIG[intent]
    savePreferences({
      intent,
      niches,
      feedMode: cfg.feedMode,
      offerTypes: cfg.offerTypes,
    })
    router.replace('/feed')
  }

  return (
    <div className="h-dvh bg-bg-void flex flex-col overflow-hidden">
      {/* Logo */}
      <div className="px-6 pt-12 pb-4 shrink-0">
        <p className="font-mono text-[15px] font-medium tracking-[.5px] text-text-hi">
          dropfeed<span className="text-heat">_</span>
        </p>
      </div>

      {/* Step dots */}
      <div className="flex gap-2 px-6 pb-6 shrink-0">
        {[0, 1].map((i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i === step ? 'bg-heat w-6' : i < step ? 'bg-heat/50 w-4' : 'bg-line w-4'
            }`}
          />
        ))}
      </div>

      {/* Steps */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence custom={dir} mode="popLayout">
          {step === 0 && (
            <motion.div
              key="step0"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 340, damping: 36 }}
              className="absolute inset-0 flex flex-col px-6"
            >
              <p className="text-text-hi text-2xl font-semibold mb-1">
                Czego szukasz?
              </p>
              <p className="text-text-lo text-sm mb-8">
                Dopasujemy feed do Twoich celów.
              </p>

              <div className="flex flex-col gap-3 flex-1">
                {INTENT_ORDER.map((key) => {
                  const cfg = INTENT_CONFIG[key]
                  const active = intent === key
                  return (
                    <button
                      key={key}
                      onClick={() => setIntent(key)}
                      className={`text-left px-4 py-4 rounded-2xl border transition-all ${
                        active
                          ? 'bg-heat-deep border-heat/60'
                          : 'bg-bg-surface border-line'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-medium leading-tight ${
                              active ? 'text-heat' : 'text-text-hi'
                            }`}
                          >
                            {cfg.label}
                          </p>
                          <p className="text-text-lo text-xs mt-1 leading-snug">
                            {cfg.sub}
                          </p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                            active ? 'bg-heat border-heat' : 'border-line'
                          }`}
                        >
                          {active && <Check size={12} strokeWidth={2.5} className="text-bg-void" />}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="py-8 shrink-0">
                <button
                  onClick={goNext}
                  disabled={!intent}
                  className="w-full flex items-center justify-center gap-2 bg-heat text-[#2A1700] font-semibold text-sm py-3.5 rounded-2xl disabled:opacity-30 transition-opacity"
                >
                  Dalej <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 340, damping: 36 }}
              className="absolute inset-0 flex flex-col px-6"
            >
              <p className="text-text-hi text-2xl font-semibold mb-1">
                Jakie nisze Cię interesują?
              </p>
              <p className="text-text-lo text-sm mb-6">
                Wybierz kilka — feed pokaże je częściej.
              </p>

              <div className="flex flex-wrap gap-2.5 flex-1 content-start">
                {ONBOARDING_NICHES.map(({ key, label }) => {
                  const active = niches.includes(key)
                  return (
                    <button
                      key={key}
                      onClick={() => toggleNiche(key)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full border text-sm transition-all ${
                        active
                          ? 'bg-heat-deep border-heat/60 text-heat'
                          : 'bg-bg-surface border-line text-text-mid'
                      }`}
                    >
                      {active && <Check size={12} strokeWidth={2.5} />}
                      {label}
                    </button>
                  )
                })}
              </div>

              <div className="py-8 shrink-0">
                <button
                  onClick={finish}
                  className="w-full flex items-center justify-center gap-2 bg-heat text-[#2A1700] font-semibold text-sm py-3.5 rounded-2xl transition-opacity"
                >
                  Zacznij przeglądać <ArrowRight size={16} />
                </button>
                <button
                  onClick={finish}
                  className="w-full text-center text-text-lo text-xs mt-3"
                >
                  pomiń — wybiorę później
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
