# CLAUDE.md — dropfeed

Ten plik czyta Claude Code przy każdej sesji. Zawiera decyzje techniczne, których NIE wolno samodzielnie zmieniać bez pytania. Kontekst produktowy jest w `PRD.md` — przeczytaj go raz na początku.

---

## Czym jest projekt

Mobilna PWA typu "Tinder/Pinterest/TikTok dla produktów dropshippingowych i inspiracji reklamowych". Użytkownik swipe'uje produkty i kreacje konkurencji, zapisuje do boardów, widzi heat score (sygnał, że produkt zarabia). Pełny opis: `PRD.md`.

## Aktualny etap

**Etap 2 — Feed na mock-danych.** Budujemy front feedu czytający z lokalnego pliku mock-danych, BEZ backendu i bez prawdziwego scrapingu. Cel: dopracować UX swipe'a i kartę zanim podłączymy realne dane. Pipeline danych (Apify, Supabase) przychodzi później (Etap 1 w numeracji danych) — ale architektura ma być na niego gotowa od teraz.

### Co zostało zrobione (2026-06-12)

Punkty 1–6 z sekcji "Pierwsze zadanie" są ukończone:

- **Inicjalizacja** — Next.js 16.2.9 + React 19 + TypeScript strict + Tailwind v4.3.1 + framer-motion 12 + @use-gesture/react 10.
- **`lib/types.ts`** — komplet encji z PRD sekcja 10: `Brand`, `Product`, `Ad`, `User`, `Board`, `SavedItem`, `Swipe`, `FeedItem`. Pole `format: 'video' | 'image'` na `Ad`, `offerType` i `confidence` na `Ad` i `Product`. BEZ pól marży/ceny źródłowej.
- **`lib/data/mock.ts`** — 30 reklam, 10 brandów, 27 produktów. Mix: wideo/grafika, fizyczne/cyfrowe/app/kursy/usługi, heat score 41–95. Placeholder images: `picsum.photos/seed/{id}/360/640`.
- **`lib/data/source.ts`** — abstrakcja: `getFeedItems()`, `getAdsByBrand()`, `getBrandById()`, `getProductById()`, `getAllBrands()`. Podmienić implementację gdy Supabase gotowe.
- **`lib/heat.ts`** — `computeHeatScore(input)` — czysta funkcja, 5 składników z PRD sekcja 9.
- **`styles/tokens.css`** — CSS vars w `:root` + `@theme inline` dla Tailwind v4. `app/globals.css` importuje plik przez `@import "../styles/tokens.css"`.

### Decyzje techniczne podjęte w sesji

- **Tailwind v4** (nie v3) — konfiguracja przez `@theme inline` w CSS, brak `tailwind.config.ts`. Kolory jako `--color-*` → klasy `bg-*`, `text-*`, `border-*`.
- **Next.js 16 + React 19** — App Router, brak `src/` directory, alias `@/*` → `./`.
- **Fonty** — Geist i Geist Mono załadowane przez `next/font/google` w `app/layout.tsx`, eksponowane jako `--font-geist-sans` / `--font-geist-mono`. W `@theme inline`: `--font-sans` i `--font-mono`.
- **Mock data** — `creativeUrl` = picsum.photos (placeholder). Pole `format` decyduje jak UI renderuje kreację.
- **`scalingSince`** — dni odkąd brand aktywnie skaluje; `undefined` = nie skaluje. Mięta `--profit` pokazuje się TYLKO gdy `scalingSince` jest ustawione.
- **`confidence`** — przy niskim confidence UI pokazuje samą markę bez nazwy oferty (dotyczy pól skrapowanych z landinga).

### Następny krok

Punkt 7 — ekran `/feed`: pełnoekranowy feed jak TikTok. SwipeDeck + SwipeCard + gesty góra/dół (nawigacja) + prawo/lewo (zapisz/pomiń) + pasek danych + pasek akcji + pasek świeżości. Wzorzec: `design-reference.html` sekcja 03.

## Stack (decyzje podjęte — nie zmieniać bez pytania)

- **Framework:** Next.js (App Router) jako PWA. Powód: web-first, najszybsza droga na telefon, twórca zna web. Ścieżka natywna PÓŹNIEJ: ten sam kod opakowany w Capacitor → App Store/Google Play (nie budujemy osobnych aplikacji natywnych; pisz kod tak, by dał się opakować — bez API niedostępnych w webview).
- **Język:** TypeScript wszędzie, tryb strict.
- **Style:** Tailwind CSS v4. Design tokens (niżej) jako zmienne CSS + `@theme inline` w `styles/tokens.css`.
- **Gesty swipe:** `@use-gesture/react` + `framer-motion` (drag, spring, threshold). Nie wymyślać własnej fizyki swipe'a.
- **Backend (od Etapu 1):** Supabase — Postgres + Auth + Storage + Edge Functions.
- **Auth:** Supabase Auth — Google OAuth (główne), magic link, email+hasło fallback. Nie budować auth od zera.
- **Pozyskiwanie danych (od Etapu 1):** Apify (`curious_coder/facebook-ads-library-scraper`) → enrichment Claude API (Haiku, batch) → Supabase.
- **Hosting:** Vercel.
- **Płatności (Etap 4):** Stripe.

> Na obecnym etapie instalujemy TYLKO: Next.js, TypeScript, Tailwind, framer-motion, @use-gesture/react. Supabase/Stripe/Apify NIE teraz.

## Warstwa danych — zasada krytyczna

Feed czyta dane przez **jedną abstrakcję** (`lib/data/source.ts`), nie bezpośrednio z mocka. Teraz ta abstrakcja zwraca dane z `lib/data/mock.ts`. Później ta sama funkcja zwróci dane z Supabase. Komponenty UI NIGDY nie wiedzą, skąd dane pochodzą.

```
UI (komponenty)  →  lib/data/source.ts (abstrakcja)  →  mock.ts  (teraz)
                                                      →  supabase (później)
```

Typy TypeScript w `lib/types.ts` są źródłem prawdy i odwzorowują encje z PRD sekcja 10 (brand, product, ad, board, saved_item, swipe, user). Mock danych MUSI być zgodny z tymi typami co do litery — żeby podmiana na realne dane była tylko zmianą implementacji `source.ts`.

## Struktura folderów (docelowa)

```
/app
  /(auth)
    /login
    /onboarding
  /(app)
    /feed              ekran główny (swipe, przełącznik trybu)
    /boards            lista + widok boardu
    /discover          wyszukiwarka + ranking
    /profile           konto, plan, limity
  layout.tsx
/components
  /feed                SwipeCard, SwipeDeck, HeatBadge, ModeToggle, MetricPill
  /deepdive            BrandProfile, AdGallery, ScalingTimeline
  /boards              BoardGrid, BoardCard, SavedItem
  /ui                  prymitywy (Button, Pill, BottomNav, Sheet...)
/lib
  types.ts             encje (źródło prawdy)
  /data
    source.ts          ABSTRAKCJA — jedyne wejście do danych
    mock.ts            dane mockowe zgodne z types.ts (Etap 2)
  heat.ts              computeHeatScore() — czysta funkcja
  personalization.ts   ważenie nisz na podstawie swipe'ów
  /i18n
    pl.ts              wszystkie stringi UI
/styles
  tokens.css           zmienne CSS + @theme inline (design tokens)
/public
  /manifest            PWA manifest, ikony
```

## Design system — tokeny

Tailwind v4: tokeny przez `@theme inline` w `styles/tokens.css`. Kolory rejestrowane jako `--color-*` → klasy `bg-*`, `text-*`, `border-*`.

Motyw ciemny, warstwowa czerń (NIE płaska czerń z jednym neonem). Ciepły akcent bursztynu = "heat/winner". Zimny akcent mięty = sygnał skalowania/wzrostu (NIE pieniądze). Wszystko jako zmienne CSS:

```css
/* TŁA — warstwy głębi */
--bg-void:     #0B0B0E;   /* tło ekranu */
--bg-surface:  #15151A;   /* karty */
--bg-raised:   #1C1C22;   /* elementy w kartach */

/* TEKST */
--text-hi:     #F2F2F0;   /* nagłówki */
--text-mid:    #9C9CA4;   /* opisy */
--text-lo:     #6E6E76;   /* podpisy */

/* AKCENTY */
--heat:        #EF9F27;   /* bursztyn: heat, CTA, winner */
--heat-deep:   #412402;   /* tło bursztynowych pilli */
--profit:      #9FE1CB;   /* mięta: TYLKO sygnał skalowania/wzrostu */
--line:        #26262C;   /* obramowania */
```

**Typografia:**
- UI / display: `Geist` (via `--font-geist-sans` z Next.js font)
- Liczby i dane (dni, heat, warianty): `Geist Mono` — monospace komunikuje "twarde dane"

**Responsywność (decyzja):** jeden kod, dwa układy. Breakpoint ~768px. Mobile = talia swipe (pełnoekranowa karta + gesty). Desktop = grid 4 kolumny jak Pinterest + boczny panel deep dive. Te same komponenty, inny layout.

**Wzorzec ekranów:** plik `design-reference.html` w korzeniu repo — otwórz i implementuj ekrany 1:1 wg makiet.

**Zasady wizualne:**
- Sygnatura produktu: heat number w monospace + animowany pasek "świeżości" na karcie. To jedyny mocny akcent — reszta cicha.
- Promienie: karty zaokrąglone (radius 16–20px), pille pełne (999px).
- Bez gradientów, bez glow/neonu poza jednym akcentem heat.
- Jedyny wyjątek: scrim na dole wideo w feedzie (gradient przezroczysty → rgba(11,11,14,.7)) dla czytelności nakładek.
- Liczby na ekranie ZAWSZE zaokrąglone (bez artefaktów floatów).
- Sentence case w UI, nigdy Title Case ani CAPS.

## Konwencje kodu

- Komponenty: PascalCase, jeden komponent na plik, nazwa pliku = nazwa komponentu.
- Hooki: `useNazwa` w `/lib/hooks` lub przy komponencie jeśli lokalny.
- Stringi UI po polsku, wyciągnięte do `lib/i18n/pl.ts` — architektura pod EN później, BEZ wdrażania EN teraz.
- Brak `any`. Typy z `lib/types.ts`.
- Funkcje logiki (heat, personalizacja) czyste i testowalne, oddzielone od UI.
- Komentarze tylko tam, gdzie "dlaczego" nie wynika z kodu.
- Importy przez alias `@/` (skonfigurowany w tsconfig).

## Czego NIE robić

- Nie podłączać Supabase/Apify/Stripe na obecnym etapie.
- Nie czytać danych w komponentach z pominięciem `lib/data/source.ts`.
- Nie wdrażać EN — tylko przygotować strukturę i18n.
- Nie wymyślać własnej fizyki swipe'a — użyć wskazanych bibliotek.
- Nie zmieniać decyzji stackowych bez zapytania.
- Nie dodawać zależności spoza listy bez uzasadnienia.
- Nie używać API niedostępnych w webview (przyszłe Capacitor).

## Pierwsze zadanie dla Claude Code (Etap 2)

1. Inicjalizacja: Next.js + TS + Tailwind + framer-motion + @use-gesture/react. ✅
2. `lib/types.ts` — encje z PRD sekcja 10. ✅
3. `lib/data/mock.ts` — ~30 realistycznych produktów zgodnych z typami (różne nisze, różne heat score). ✅
4. `lib/data/source.ts` — abstrakcja zwracająca mock. ✅
5. `lib/heat.ts` — `computeHeatScore()`. ✅
6. `styles/tokens.css` + globals.css z tokenami. ✅
7. Ekran `/feed` — format PEŁNOEKRANOWY jak TikTok: kreacja (wideo 9:16 autoplay bez dźwięku LUB statyczna grafika) wypełnia ekran. Nakładki: zakładki Inspiracje/Produkty/Gorące na samej górze; górny pasek danych (same ikony+liczby): Heat pill (bursztyn) · ikona kategorii oferty · zegar+"47d" · stos+"12" · ikona formatu. Pasek akcji przy prawej krawędzi: zapisz / deep dive / strona. Lewy dół minimalny: avatar + marka + miętowy pill "skaluje" (warunkowy) + nazwa oferty. Pasek świeżości na dole. Gesty: góra/dół = nawigacja, prawo = zapisz, lewo = pomiń, tap na kreację = dźwięk. Coach mark przy pierwszej karcie. Desktop (≥768px): Grid (miniatury, hover odtwarza) i Player (kreacja 9:16 + panel danych). Wzorzec: design-reference.html.
8. Bottom nav + puste ekrany Boardy/Odkrywaj/Profil (szkielety).

@AGENTS.md
