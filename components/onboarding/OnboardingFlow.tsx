'use client'

import { useState } from 'react'
import {
  INTENT_CONFIG,
  ONBOARDING_NICHES,
  resolveNiches,
  type IntentKey,
} from '@/lib/preferences'
import { createClient } from '@/lib/supabase/client'
import { SwipeSpyLogo } from '@/components/SwipeSpyLogo'

const INTENT_ORDER: IntentKey[] = ['physical', 'digital', 'inspirations', 'any']

const ICONS: Record<IntentKey, string> = {
  physical: '📦',
  digital: '💻',
  inspirations: '✨',
  any: '🧭',
}

export default function OnboardingFlow() {
  const [step, setStep] = useState(0)
  const [intent, setIntent] = useState<IntentKey | null>(null)
  const [niches, setNiches] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const toggleNiche = (key: string) =>
    setNiches((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )

  const finish = async () => {
    if (!intent || saving) return
    setSaving(true)
    const supabase = createClient()
    // zapis na koncie (RPC server-side); selected_niches = rozwiązane nisze
    const { error } = await supabase.rpc('set_onboarding', {
      p_intent: intent,
      p_niches: resolveNiches(niches),
    })
    if (error) { setSaving(false); return }
    window.location.replace('/feed')
  }

  return (
    <div
      style={{
        height: '100dvh',
        background: '#0B0B0E',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '48px 24px 8px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <SwipeSpyLogo className="text-[1.1rem]" />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div
            style={{
              height: 3,
              borderRadius: 999,
              width: step === 0 ? 20 : 12,
              background: '#EF9F27',
              transition: 'width 300ms',
            }}
          />
          <div
            style={{
              height: 3,
              borderRadius: 999,
              width: step === 1 ? 20 : 12,
              background: step >= 1 ? '#EF9F27' : '#26262C',
              transition: 'width 300ms, background 300ms',
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '32px 24px 0',
          overflowY: 'auto',
        }}
      >
        {step === 0 ? (
          <>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: '#F2F2F0',
                letterSpacing: '-0.5px',
                lineHeight: 1.2,
                marginBottom: 8,
                marginTop: 0,
              }}
            >
              Czego szukasz?
            </h1>
            <p
              style={{
                fontSize: 14,
                color: '#6E6E76',
                marginBottom: 32,
                marginTop: 0,
                lineHeight: 1.5,
              }}
            >
              Dopasujemy feed do Twoich celów
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: active ? 'rgba(239,159,39,0.15)' : '#1C1C22',
                        fontSize: 20,
                      }}
                    >
                      {ICONS[intentKey]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: active ? '#EF9F27' : '#F2F2F0',
                          marginBottom: 2,
                          marginTop: 0,
                          lineHeight: 1.3,
                        }}
                      >
                        {cfg.label}
                      </p>
                      <p
                        style={{
                          fontSize: 12,
                          color: '#6E6E76',
                          lineHeight: 1.4,
                          margin: 0,
                        }}
                      >
                        {cfg.sub}
                      </p>
                    </div>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        flexShrink: 0,
                        border: `1.5px solid ${active ? '#EF9F27' : '#26262C'}`,
                        background: active ? '#EF9F27' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        color: '#2A1700',
                        fontWeight: 900,
                      }}
                    >
                      {active ? '✓' : ''}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: '#F2F2F0',
                letterSpacing: '-0.5px',
                lineHeight: 1.2,
                marginBottom: 8,
                marginTop: 0,
              }}
            >
              Twoje nisze
            </h1>
            <p
              style={{
                fontSize: 14,
                color: '#6E6E76',
                marginBottom: 24,
                marginTop: 0,
                lineHeight: 1.5,
              }}
            >
              Wybierz kilka — pojawią się częściej w feedzie
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
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
                    {active ? '✓ ' : ''}
                    {label}
                  </button>
                )
              })}
            </div>
          </>
        )}

        <div style={{ flexShrink: 0, height: 128 }} />
      </div>

      {/* CTA */}
      <div
        style={{
          flexShrink: 0,
          padding: '16px 24px 40px',
          background: 'linear-gradient(to top, #0B0B0E 70%, transparent)',
        }}
      >
        {step === 0 ? (
          <button
            type="button"
            onClick={() => intent && setStep(1)}
            disabled={!intent}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
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
            Dalej →
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              type="button"
              onClick={finish}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
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
              Zacznij przeglądać →
            </button>
            <button
              type="button"
              onClick={finish}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#6E6E76',
                fontSize: 12,
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              pomiń — wybiorę później
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
