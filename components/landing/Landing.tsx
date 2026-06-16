import Link from 'next/link'

const WRAP = 'mx-auto max-w-[1140px] px-6'
const EYEBROW = 'text-heat text-[13px] font-semibold tracking-[0.08em] uppercase text-center mb-3.5'
const H2 = 'text-[30px] md:text-[40px] leading-[1.1] tracking-[-0.025em] font-bold text-center mb-4'
const SEC_SUB = 'text-[18px] text-text-mid text-center max-w-[560px] mx-auto mb-14'
const BTN_PRIMARY =
  'bg-gradient-to-br from-heat to-[#f0a838] text-bg-void rounded-xl font-semibold shadow-[0_6px_24px_rgba(239,159,39,0.28)] hover:-translate-y-0.5 transition-transform'

const STEPS = [
  { n: 1, t: 'Wybierz, co cię kręci', d: 'Beauty, dom, fitness, gadżety, moda… Zaznaczasz swoje nisze, a feed dopasowuje się do ciebie — z regularną dawką odkryć z innych kategorii.' },
  { n: 2, t: 'Scrolluj winnery', d: 'Reklamy na cały ekran, posortowane wskaźnikiem „heat" — im wyżej, tym mocniej dana reklama skaluje. Przesuwasz w górę po kolejną, jak na TikToku.' },
  { n: 3, t: 'Wejdź głębiej', d: 'Tapnięcie w markę pokazuje, ile reklam prowadzi, jak długo działają i link prosto do biblioteki reklam. Zapisujesz najlepsze na swoje tablice.' },
]

const FEATURES = [
  { ic: '🔥', t: 'Wskaźnik heat', d: 'Jedna liczba mówi, jak mocno reklama skaluje — z długości życia, liczby wariantów i zasięgu. Winnery same wypływają na górę.' },
  { ic: '✅', t: 'Tylko żywe reklamy', d: 'Codziennie sprawdzamy, co wciąż działa. Reklama wyłączona znika z feedu — nie tracisz czasu na martwe pomysły.' },
  { ic: '🌍', t: 'Polska i świat', d: 'Reklamy z Polski, USA, UK i rynków UE. Zobacz, co działa lokalnie i co dopiero nadejdzie z zagranicy.' },
  { ic: '🔎', t: 'Deep dive marki', d: 'Ile reklam prowadzi marka, jak długo, w jakim formacie — i link prosto do jej biblioteki reklam na Facebooku.' },
  { ic: '📌', t: 'Twoje tablice', d: 'Zapisuj najlepsze reklamy na tematyczne tablice. Wracasz do nich, kiedy planujesz własną kampanię.' },
  { ic: '🆕', t: 'Codziennie świeże', d: 'Nowe reklamy wpadają każdego dnia. Otwierasz rano i masz nową porcję pomysłów — feed nigdy się nie kończy.' },
]

function Logo() {
  return (
    <div className="flex items-center gap-2.5 font-bold text-[19px] tracking-tight text-text-hi">
      <span className="w-[30px] h-[30px] rounded-lg bg-gradient-to-br from-heat to-[#f5b955] flex items-center justify-center text-base">🔥</span>
      dropfeed
    </div>
  )
}

function Phone({ variant, emoji, chips, brand, desc }: {
  variant: 'left' | 'center' | 'right'
  emoji: string
  chips: { label: string; heat?: boolean }[]
  brand: string
  desc: string
}) {
  const pos =
    variant === 'center'
      ? 'md:[transform:translateY(-18px)_scale(1.04)] z-[2] border-heat/30'
      : variant === 'left'
        ? 'hidden md:block md:[transform:rotateY(14deg)] opacity-85'
        : 'hidden md:block md:[transform:rotateY(-14deg)] opacity-85'
  return (
    <div className={`w-[230px] h-[470px] bg-bg-raised border border-line rounded-[30px] p-2.5 shrink-0 shadow-[0_30px_80px_rgba(0,0,0,0.5)] ${pos}`}>
      <div className="w-full h-full rounded-[22px] overflow-hidden relative bg-gradient-to-b from-[#1a1d27] to-[#0e1015]">
        <div className="absolute inset-0 flex items-center justify-center text-[60px] opacity-50">{emoji}</div>
        <div className="absolute top-3 left-3 right-3 flex gap-1.5 z-[2]">
          {chips.map((c, i) => (
            <span key={i} className={`bg-bg-void/60 backdrop-blur rounded-lg px-2 py-1 text-[11px] font-semibold flex items-center gap-1 ${c.heat ? 'text-heat' : 'text-white'}`}>
              {c.label}
            </span>
          ))}
        </div>
        <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-bg-void/90 to-transparent z-[2]">
          <div className="text-[13px] font-semibold mb-0.5 text-text-hi">{brand}</div>
          <div className="text-[11px] text-text-mid">{desc}</div>
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  return (
    <div className="bg-bg-void text-text-hi min-h-dvh overflow-x-hidden scroll-smooth">
      {/* NAV */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-bg-void/70 border-b border-line">
        <div className={`${WRAP} flex items-center justify-between h-16`}>
          <Logo />
          <div className="flex items-center gap-7 text-sm text-text-mid">
            <a href="#jak" className="hidden md:inline hover:text-text-hi transition-colors">Jak działa</a>
            <a href="#funkcje" className="hidden md:inline hover:text-text-hi transition-colors">Funkcje</a>
            <a href="#cennik" className="hidden md:inline hover:text-text-hi transition-colors">Cennik</a>
            <Link href="/login" className="bg-text-hi text-bg-void px-[18px] py-[9px] rounded-[9px] font-semibold text-sm hover:-translate-y-px transition-transform">
              Zaloguj się
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="relative text-center pt-16 pb-12 md:pt-[90px] md:pb-[70px] overflow-hidden">
        <div className="absolute rounded-full blur-[120px] w-[600px] h-[600px] bg-heat -top-[280px] left-1/2 -translate-x-1/2 opacity-[0.18] pointer-events-none z-0" />
        <div className={`${WRAP} relative z-10`}>
          <div className="inline-flex items-center gap-2 bg-heat/10 border border-heat/25 text-heat px-3.5 py-1.5 rounded-full text-[13px] font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-heat shadow-[0_0_8px_#EF9F27]" />
            Świeże, aktywne reklamy każdego dnia
          </div>
          <h1 className="text-[38px] md:text-[58px] leading-[1.04] tracking-[-0.03em] font-bold mb-5">
            Winnery, które <span className="bg-gradient-to-r from-heat to-[#f5c46d] bg-clip-text text-transparent">scrollujesz</span>
            <br />jak TikToka
          </h1>
          <p className="text-[17px] md:text-xl text-text-mid max-w-[620px] mx-auto mb-9">
            Reklamy, które realnie sprzedają — w feedzie, który wciąga zamiast męczyć. Bez tabel, bez filtrów jak z Excela. Po prostu przesuwasz i odkrywasz, co działa teraz.
          </p>
          <div className="flex gap-3.5 justify-center items-center flex-wrap">
            <Link href="/register" className={`${BTN_PRIMARY} px-[30px] py-[15px] text-base`}>Załóż konto za darmo →</Link>
            <a href="#jak" className="text-text-mid px-[22px] py-[15px] text-base font-medium hover:text-text-hi transition-colors">Zobacz jak działa</a>
          </div>
          <div className="text-[13px] text-text-lo mt-[18px]">20 reklam dziennie za darmo · bez karty · konto w 30 sekund</div>

          {/* PHONES */}
          <div className="mt-[60px] flex justify-center gap-[18px] [perspective:1200px]">
            <Phone variant="left" emoji="💄" brand="GlowRoutine" desc="Serum, które…" chips={[{ label: '🔥 71', heat: true }, { label: '📅 32d' }]} />
            <Phone variant="center" emoji="🧴" brand="Rutyna Urody PL" desc="Masażer limfatyczny — efekt w 14 dni" chips={[{ label: '🔥 88', heat: true }, { label: '📅 47d' }, { label: '🎬 12' }]} />
            <Phone variant="right" emoji="🐶" brand="PupPup" desc="Szelki, które…" chips={[{ label: '🔥 64', heat: true }, { label: '📅 19d' }]} />
          </div>
        </div>
      </header>

      {/* PROBLEM */}
      <section className="relative py-14 md:py-20 bg-bg-surface border-y border-line">
        <div className={WRAP}>
          <div className={EYEBROW}>Znasz to uczucie</div>
          <h2 className={H2}>Research reklam nie musi być nudny</h2>
          <p className={SEC_SUB}>Narzędzia do podglądania reklam mają dane — ale używa się ich jak arkusza kalkulacyjnego. dropfeed odwraca to do góry nogami.</p>
          <div className="grid md:grid-cols-2 gap-6 max-w-[860px] mx-auto">
            <div className="p-7 rounded-2xl border bg-[#ef4444]/5 border-[#ef4444]/15">
              <h3 className="text-[15px] font-semibold mb-4 text-[#f87171]">✕ Jak to wygląda dzisiaj</h3>
              <ul className="flex flex-col gap-3">
                {['Tabele, filtry, dwadzieścia kolumn — zanim cokolwiek zobaczysz', 'Nie wiesz, czy reklama wciąż działa, czy ktoś ją wyłączył miesiąc temu', 'Research to obowiązek, nie przyjemność — odkładasz go', 'Ceny jak za narzędzie dla korporacji'].map((li) => (
                  <li key={li} className="text-[15px] text-text-mid flex gap-2.5 items-start">
                    <span className="mt-2 w-[5px] h-[5px] rounded-full bg-current opacity-50 shrink-0" />{li}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-7 rounded-2xl border bg-profit/10 border-profit/20">
              <h3 className="text-[15px] font-semibold mb-4 text-profit">✓ Jak to wygląda w dropfeed</h3>
              <ul className="flex flex-col gap-3">
                {['Otwierasz i scrollujesz — reklama na cały ekran, jak w social mediach', 'Widzisz tylko reklamy żywe i sprawdzone — minimum 7 dni na rynku', 'Wciąga jak feed — wracasz codziennie po nowe pomysły', 'Zaczynasz za darmo, płacisz tyle co za lunch'].map((li) => (
                  <li key={li} className="text-[15px] text-text-mid flex gap-2.5 items-start">
                    <span className="mt-2 w-[5px] h-[5px] rounded-full bg-current opacity-50 shrink-0" />{li}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* JAK DZIAŁA */}
      <section id="jak" className="relative py-14 md:py-20">
        <div className={WRAP}>
          <div className={EYEBROW}>Jak to działa</div>
          <h2 className={H2}>Od pomysłu do winnera w trzy ruchy</h2>
          <p className={SEC_SUB}>Bez konfiguracji, bez instrukcji. Wchodzisz i od razu wiesz, co robić.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((s) => (
              <div key={s.n} className="p-[30px] rounded-2xl bg-bg-raised border border-line">
                <div className="w-[34px] h-[34px] rounded-[9px] bg-heat/10 text-heat flex items-center justify-center font-bold text-[15px] mb-[18px]">{s.n}</div>
                <h3 className="text-lg font-semibold mb-2">{s.t}</h3>
                <p className="text-sm text-text-mid">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FUNKCJE */}
      <section id="funkcje" className="relative py-14 md:py-20 bg-bg-surface border-y border-line">
        <div className={WRAP}>
          <div className={EYEBROW}>Co dostajesz</div>
          <h2 className={H2}>Wszystko, czego potrzebujesz do researchu</h2>
          <p className={SEC_SUB}>Bez przeładowania. Tylko sygnały, które realnie pomagają zdecydować.</p>
          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div key={f.t} className="p-[26px] rounded-2xl border border-line bg-bg-raised hover:border-heat/30 hover:-translate-y-0.5 transition-all">
                <div className="w-[42px] h-[42px] rounded-[11px] bg-heat/10 flex items-center justify-center text-[21px] mb-4">{f.ic}</div>
                <h3 className="text-base font-semibold mb-2">{f.t}</h3>
                <p className="text-sm text-text-mid">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CENNIK */}
      <section id="cennik" className="relative py-14 md:py-20">
        <div className={WRAP}>
          <div className={EYEBROW}>Cennik</div>
          <h2 className={H2}>Zacznij za darmo</h2>
          <p className={SEC_SUB}>Bez karty, bez zobowiązań. Płacisz dopiero, gdy poczujesz, że chcesz więcej.</p>
          <div className="grid md:grid-cols-2 gap-6 max-w-[780px] mx-auto">
            {/* Free */}
            <div className="p-[34px] rounded-[20px] border border-line bg-bg-raised relative">
              <div className="text-[15px] font-semibold text-text-mid mb-2.5">Free</div>
              <div className="text-[42px] font-bold tracking-[-0.02em] mb-1">0 zł</div>
              <div className="text-[13px] text-text-lo mb-[22px]">na zawsze</div>
              <ul className="flex flex-col gap-3 mb-[26px]">
                {['20 reklam dziennie', 'Pełny feed i wskaźnik heat', 'Deep dive marek', 'Własne tablice'].map((li) => (
                  <li key={li} className="text-sm text-text-mid flex gap-2.5 items-center"><span className="text-profit shrink-0">✓</span>{li}</li>
                ))}
              </ul>
              <Link href="/register" className="block text-center py-[13px] rounded-[11px] font-semibold text-[15px] bg-transparent border border-line text-text-hi hover:border-text-mid transition-colors">Załóż konto</Link>
            </div>
            {/* Pro */}
            <div className="p-[34px] rounded-[20px] border border-heat/40 bg-gradient-to-b from-heat/[0.06] to-bg-raised relative">
              <div className="absolute -top-[11px] right-6 bg-heat text-bg-void text-xs font-bold px-3 py-[5px] rounded-full">POPULARNE</div>
              <div className="text-[15px] font-semibold text-text-mid mb-2.5">Pro</div>
              <div className="text-[42px] font-bold tracking-[-0.02em] mb-1">49 zł <span className="text-base text-text-lo font-medium">/ mies.</span></div>
              <div className="text-[13px] text-text-lo mb-[22px]">taniej w planie rocznym</div>
              <ul className="flex flex-col gap-3 mb-[26px]">
                <li className="text-sm text-text-mid flex gap-2.5 items-center"><span className="text-profit shrink-0">✓</span><span><strong className="text-text-hi">Nielimitowane</strong> scrollowanie</span></li>
                <li className="text-sm text-text-mid flex gap-2.5 items-center"><span className="text-profit shrink-0">✓</span>Wszystko z planu Free</li>
                <li className="text-sm text-text-mid flex gap-2.5 items-center"><span className="text-profit shrink-0">✓</span>Pierwszeństwo w nowych funkcjach</li>
                <li className="text-sm text-text-mid flex gap-2.5 items-center"><span className="text-profit shrink-0">✓</span>Bez reklam, bez limitów</li>
              </ul>
              <Link href="/register" className={`${BTN_PRIMARY} block text-center py-[13px] text-[15px]`}>Zacznij za darmo →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative py-14 md:py-20 text-center overflow-hidden">
        <div className="absolute rounded-full blur-[120px] w-[500px] h-[500px] bg-heat -bottom-[300px] left-1/2 -translate-x-1/2 opacity-[0.16] pointer-events-none z-0" />
        <div className={`${WRAP} relative z-10`}>
          <h2 className={H2}>Zobacz, co sprzedaje — dziś</h2>
          <p className={SEC_SUB}>Dołącz i scrolluj pierwsze winnery w mniej niż minutę.</p>
          <Link href="/register" className={`${BTN_PRIMARY} inline-block px-[30px] py-[15px] text-base`}>Załóż konto za darmo →</Link>
          <div className="text-[13px] text-text-lo mt-[18px]">20 reklam dziennie gratis · bez karty</div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-line py-9 bg-bg-surface">
        <div className={`${WRAP} flex justify-between items-center flex-wrap gap-4`}>
          <Logo />
          <div className="flex gap-6 text-sm text-text-lo">
            <a href="#" className="hover:text-text-mid transition-colors">Prywatność</a>
            <a href="#" className="hover:text-text-mid transition-colors">Regulamin</a>
            <a href="#" className="hover:text-text-mid transition-colors">Kontakt</a>
          </div>
          <div className="text-[13px] text-text-lo">© 2026 dropfeed</div>
        </div>
      </footer>
    </div>
  )
}
