import Link from 'next/link'
import { ArrowLeft, Check, X, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SwipeSpyLogo } from '@/components/SwipeSpyLogo'
import ReconAdGrid, { type ReconAd } from '@/components/recon/ReconAdGrid'

// Strona-raport z testu „TikTok ads → produkty". Czyta artefakt tiktok_ad_recon
// (zapisany przez scripts/tiktok-recon.ts). Czysto poglądowa, bez interakcji.
export const dynamic = 'force-dynamic'

const fmt = (n: number) => n.toLocaleString('pl-PL', { maximumFractionDigits: 2 })

function Verdict({ kind }: { kind: 'fail' | 'weak' }) {
  if (kind === 'weak')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-heat-deep border border-heat/30 px-2.5 py-1 text-[11px] font-medium text-heat">
        <AlertTriangle size={12} /> zawodny
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-raised border border-line px-2.5 py-1 text-[11px] font-medium text-text-mid">
      <X size={12} /> 0 trafień
    </span>
  )
}

export default async function TikTokReconPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('tiktok_ad_recon')
    .select('ad_id, advertiser, reach, cta, first_shown, last_shown, regions, media_url, matched_product_id, brand_match, hamming')

  const rows = (data ?? []) as (ReconAd & { matched_product_id: string | null; brand_match: string | null; hamming: number | null })[]
  const total = rows.length
  const aHits = rows.filter((r) => r.matched_product_id).length
  const cHits = rows.filter((r) => r.brand_match).length
  const closest = rows.reduce<number | null>((m, r) => (r.hamming != null && (m == null || r.hamming < m) ? r.hamming : m), null)

  // galeria: po jednym przykładzie na reklamodawcę, najlepiej z działającą miniaturą
  const byAdv = new Map<string, ReconAd>()
  for (const r of rows) {
    const k = r.advertiser ?? r.ad_id
    if (!byAdv.has(k) && r.media_url) byAdv.set(k, r)
  }
  const examples = [...byAdv.values()].slice(0, 9)

  const Bridge = ({
    tag, title, sub, verdict, points,
  }: { tag: string; title: string; sub: string; verdict: 'fail' | 'weak'; points: string[] }) => (
    <div className="rounded-2xl border border-line bg-bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] text-text-lo">{tag}</div>
          <h3 className="text-text-hi font-semibold mt-0.5">{title}</h3>
        </div>
        <Verdict kind={verdict} />
      </div>
      <p className="text-text-mid text-sm mt-2">{sub}</p>
      <ul className="mt-3 space-y-1.5">
        {points.map((p, i) => (
          <li key={i} className="flex gap-2 text-[13px] text-text-mid">
            <span className="text-text-lo mt-px">–</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <div className="h-full overflow-y-auto bg-bg-void">
      <div className="mx-auto max-w-2xl px-5 pt-8 pb-20">
        <div className="mb-6">
          <SwipeSpyLogo className="text-[1.2rem]" />
        </div>
        <Link href="/propozycje" className="inline-flex items-center gap-1.5 text-text-lo text-sm mb-8 hover:text-text-mid transition-colors">
          <ArrowLeft size={15} /> wróć
        </Link>

        {/* Nagłówek */}
        <h1 className="text-text-hi text-3xl font-semibold tracking-tight">Test: TikTok ads → produkty</h1>
        <p className="text-text-mid text-sm mt-3 leading-relaxed">
          Reklamy z TikToka da się scrapować z biblioteki reklam (EU Ad Library) — ale{' '}
          <span className="text-text-hi">żaden scraper nie zwraca linku docelowego</span> (do jakiego produktu/sklepu
          prowadzi reklama). Przetestowałem 3 tanie „mostki", które miały odzyskać to powiązanie z danych, które już
          mamy. Poniżej realny wynik na próbce <span className="font-mono text-text-hi">{total}</span> reklam.
        </p>

        {/* Wynik skrótem */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { k: 'Reklam w teście', v: String(total) },
            { k: 'Powiązań z produktem', v: String(aHits + cHits) },
            { k: 'Koszt scrapingu', v: '$0,25' },
          ].map((s) => (
            <div key={s.k} className="rounded-xl border border-line bg-bg-surface px-3 py-3 text-center">
              <div className="font-mono text-2xl text-text-hi">{s.v}</div>
              <div className="text-[11px] text-text-lo mt-1 leading-tight">{s.k}</div>
            </div>
          ))}
        </div>

        {/* Mostki */}
        <h2 className="text-text-hi text-lg font-semibold mt-10 mb-3">Trzy mostki — co wyszło</h2>
        <div className="space-y-3">
          <Bridge
            tag="MOSTEK A"
            title="Odcisk kreacji (pHash) ↔ reklama FB"
            sub="Ta sama kreacja na TikToku i na FB = ten sam produkt → reklama TikToka dziedziczy link/ofertę z FB."
            verdict="fail"
            points={[
              `${aHits}/${total} trafień (próg Hamming ≤10). Najbliższe dopasowanie w całej próbce = ${closest ?? '—'} — czyli przypadkowe, nie ta sama kreacja.`,
              'Dołożyłem test celowany: scrape TikToka po nazwach marek, które już mamy na FB (BURGA, Rockbros, Posturex…) — nadal 0 trafień.',
              'Powód: te same marki używają na TikToku innych kreacji niż na FB, a nasza pula FB jest mała i głównie PL. Współdzielenie kreacji ≈ 0 przy obecnej skali.',
            ]}
          />
          <Bridge
            tag="MOSTEK B"
            title="Reklamodawca → profil TikTok → link w bio → Shopify"
            sub="Z nazwy reklamodawcy znaleźć jego profil, z bio wyciągnąć domenę sklepu i sprawdzić czy to Shopify."
            verdict="weak"
            points={[
              'Biblioteka podaje tylko nazwę wyświetlaną reklamodawcy (np. „Fearless Shop”), nie handle profilu.',
              'Szukanie po tej nazwie zwraca losowe konta (gracz „Fe4RLess”, przypadkowa „diamonddee11”), a link w bio zwykle pusty.',
              'Bez pewnego dopasowania profilu mostek daje fałszywe powiązania — nie nadaje się do produkcji.',
            ]}
          />
          <Bridge
            tag="MOSTEK C"
            title="Nazwa reklamodawcy ↔ marka w naszej bazie FB"
            sub="Jeśli reklamodawca TikToka = marka, którą już znamy z FB — podpinamy pod nią."
            verdict="fail"
            points={[
              `${cHits}/${total} trafień.`,
              'Reklamodawcy z EU Ad Library to inne, w większości zagraniczne sklepy (NL, GB, FR, TR…) niż nasze polskie marki z FB.',
              'Pokrycie nazw = zero w tej próbce.',
            ]}
          />
        </div>

        {/* Co JEDNAK działa */}
        <h2 className="text-text-hi text-lg font-semibold mt-10 mb-2">Co jednak działa — i jest tanie</h2>
        <p className="text-text-mid text-sm leading-relaxed">
          Sam scraping biblioteki TikToka jest tani i daje <span className="text-text-hi">realny, osobny zbiór danych
          o reklamach</span>: reklamodawca, rynki, daty (czyli <span className="text-text-hi">żywotność</span> — mocny
          sygnał winnera), szacowany zasięg, cel kampanii i CTA. Dla rynku PL dochodzi targeting (wiek, płeć, języki).
          Brakuje tylko dwóch rzeczy: linku docelowego i pewnego powiązania z konkretnym produktem.
        </p>

        {/* Przykłady reklam */}
        <h2 className="text-text-hi text-lg font-semibold mt-10 mb-1">Przykłady zescrapowanych reklam</h2>
        <p className="text-text-lo text-xs mb-4">
          Realne reklamy z biblioteki TikTok (EU). Dane = to, co faktycznie dostajemy z jednego scrape. Klik w kartę
          otwiera <span className="text-text-mid">stronę reklamy w bibliotece TikToka</span> — to jedyny link, jaki mamy
          (do sklepu/produktu reklama nie prowadzi w scrape).
        </p>
        <ReconAdGrid ads={examples} />

        {/* Koszt */}
        <h2 className="text-text-hi text-lg font-semibold mt-10 mb-3">Koszt</h2>
        <div className="rounded-2xl border border-line bg-bg-surface p-5 space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-text-mid">Cały test (≈250 reklam, kilka przebiegów)</span><span className="font-mono text-text-hi">$0,25</span></div>
          <div className="flex justify-between"><span className="text-text-mid">Koszt jednostkowy</span><span className="font-mono text-text-hi">~${fmt(0.0014)}/reklama</span></div>
          <div className="h-px bg-line" />
          <div className="flex justify-between"><span className="text-text-mid">Gdyby zbierać 200 reklam/dzień</span><span className="font-mono text-text-hi">~$8/mc</span></div>
          <div className="flex justify-between"><span className="text-text-mid">Gdyby zbierać 500 reklam/dzień</span><span className="font-mono text-text-hi">~$21/mc</span></div>
          <p className="text-text-lo text-xs pt-1">pHash i całe dopasowanie liczymy u siebie — $0. Płacimy wyłącznie za scraping.</p>
        </div>

        {/* Wniosek */}
        <h2 className="text-text-hi text-lg font-semibold mt-10 mb-3">Wniosek</h2>
        <div className="rounded-2xl border border-line bg-bg-surface p-5 space-y-3 text-sm text-text-mid leading-relaxed">
          <p className="flex gap-2"><X size={16} className="text-text-lo shrink-0 mt-0.5" /> Tanie mostki <span className="text-text-hi">nie</span> wiążą reklamy TikToka z produktem przy naszej obecnej skali. Nie buduję tego teraz jako funkcji.</p>
          <p className="flex gap-2"><Check size={16} className="text-profit shrink-0 mt-0.5" /> Bibliotekę reklam TikToka warto scrapować jako <span className="text-text-hi">osobny sygnał</span> (żywotność + rynki + targeting PL) — tanio, bez linku do produktu.</p>
          <p className="flex gap-2"><AlertTriangle size={16} className="text-heat shrink-0 mt-0.5" /> pHash zacznie łapać dopiero przy <span className="text-text-hi">dużym pokryciu tych samych marek na FB i TikToku</span>. Pewny link do produktu = zbieracz reklam „z feedu” (ryzyko regulaminu, ~$setki/mc) — nie teraz.</p>
        </div>
      </div>
    </div>
  )
}
