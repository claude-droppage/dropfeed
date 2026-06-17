import type { DiscoverySignal } from '@/lib/types'

// Ton koloru = znaczenie sygnału: momentum/nowe = wzrost (mięta), cross-market =
// niebieski, heat = bursztyn, liczba sklepów = neutralny.
const TONE: Record<DiscoverySignal['kind'], string> = {
  momentum: 'bg-profit/10 text-profit',
  new: 'bg-profit/10 text-profit',
  cross: 'bg-[#7DA8F5]/15 text-[#7DA8F5]',
  heat: 'bg-heat/10 text-heat',
  stores: 'bg-bg-surface border border-line text-text-mid',
}

export default function SignalChip({ signal }: { signal: DiscoverySignal }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1.5 rounded-md ${TONE[signal.kind]}`}>
      {signal.label}
    </span>
  )
}
