import { Search, TrendingUp, Grid3X3 } from 'lucide-react'
import { pl } from '@/lib/i18n/pl'

const TRENDING = [
  'posture corrector',
  'mini blender',
  'pet tracker',
  'galaxy projector',
  'skin care set',
]

const TOP_NICHES = [
  { label: 'fitness', count: '240+' },
  { label: 'beauty', count: '180+' },
  { label: 'pet', count: '130+' },
  { label: 'kitchen', count: '110+' },
  { label: 'tech', count: '90+' },
  { label: 'home', count: '75+' },
]

export default function DiscoverPage() {
  return (
    <div className="h-full flex flex-col bg-bg-void overflow-y-auto">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 shrink-0">
        <p className="font-medium text-text-hi mb-3">{pl.discover.title}</p>
        {/* Search bar placeholder */}
        <div className="flex items-center gap-2 bg-bg-surface border border-line rounded-full px-4 py-2.5">
          <Search size={15} className="text-text-lo shrink-0" />
          <span className="text-sm text-text-lo">{pl.discover.searchPlaceholder}</span>
        </div>
      </div>

      {/* Trending now */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-heat" />
          <p className="text-xs font-medium text-text-mid uppercase tracking-wider">
            {pl.discover.trending}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {TRENDING.map((term) => (
            <div
              key={term}
              className="bg-bg-surface border border-line rounded-full px-3 py-1.5 text-xs text-text-mid"
            >
              {term}
            </div>
          ))}
        </div>
      </div>

      {/* Top niches */}
      <div className="px-4 pb-6">
        <div className="flex items-center gap-2 mb-3">
          <Grid3X3 size={14} className="text-text-lo" />
          <p className="text-xs font-medium text-text-mid uppercase tracking-wider">
            {pl.discover.topNiches}
          </p>
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {TOP_NICHES.map((niche) => (
            <div
              key={niche.label}
              className="bg-bg-surface border border-line rounded-xl px-3 py-3"
            >
              <p className="text-sm font-medium text-text-hi capitalize">{niche.label}</p>
              <p className="text-xs text-text-lo font-mono mt-0.5">{niche.count} reklam</p>
            </div>
          ))}
        </div>
      </div>

      {/* Coming soon notice */}
      <div className="px-4 pb-8">
        <div className="bg-bg-surface border border-line rounded-xl px-4 py-4 text-center">
          <p className="text-text-lo text-xs">Pełna wyszukiwarka i ranking — {pl.discover.soon}</p>
        </div>
      </div>
    </div>
  )
}
