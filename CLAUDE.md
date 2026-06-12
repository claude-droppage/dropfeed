# CLAUDE.md — dropfeed

Ten plik czyta Claude Code przy każdej sesji. Zawiera decyzje techniczne, których NIE wolno samodzielnie zmieniać bez pytania. Kontekst produktowy jest w `PRD.md` — przeczytaj go raz na początku.

---

## Czym jest projekt

Mobilna PWA typu "Tinder/Pinterest/TikTok dla produktów dropshippingowych i inspiracji reklamowych". Użytkownik swipe'uje produkty i kreacje konkurencji, zapisuje do boardów, widzi heat score (sygnał, że produkt zarabia). Pełny opis: `PRD.md`.

## Aktualny etap

**Etap 2 — Feed na mock-danych.** Budujemy front feedu czytający z lokalnego pliku mock-danych, BEZ backendu i bez prawdziwego scrapingu. Cel: dopracować UX swipe'a i kartę zanim podłączymy realne dane. Pipeline danych (Apify, Supabase) przychodzi później (Etap 1 w numeracji danych) — ale architektura ma być na niego gotowa od teraz.

### Co jest ukończone (2026-06-12) — punkty 1–7 ✅

**Fundament (punkty 1–6):**
- **Inicjalizacja** — Next.js 16.2.9 + React 19 + TypeScript strict + Tailwind v4.3.1 + framer-motion 12 + @use-gesture/react 10 + lucide-react.
- **`lib/types.ts`** — komplet encji: `Brand`, `Product`, `Ad`, `User`, `Board`, `SavedItem`, `Swipe`, `FeedItem`.
- **`lib/data/mock.ts`** — 30 reklam, 10 brandów, 27 produktów. Placeholder images: `picsum.photos/seed/{id}/360/640`.
- **`lib/data/source.ts`** — abstrakcja danych (podmienić na Supabase bez zmian w UI).
- **`lib/heat.ts`** — `computeHeatScore(input)`, 5 składników z PRD sekcja 9.
- **`styles/tokens.css`** — CSS vars + `@theme inline` dla Tailwind v4.

**Feed mobilny (punkt 7 mobile):**
- **`components/feed/SwipeDeck.tsx`** — silnik gestów (@use-gesture) + animacje (framer-motion). Góra/dół = spring slide, prawo = save flyoff, lewo = skip flyoff. `transitioning` ref blokuje re-entrancję.
- **`components/feed/SwipeCard.tsx`** — pełnoekranowa karta: kreacja, scrim, top data bar, prawy pasek akcji, lewy dół (marka + pill "skaluje"), pasek świeżości.
- **`components/feed/FeedView.tsx`** — split `md:hidden` / `hidden md:block` (mobile vs desktop).
- **`components/feed/ModeToggle.tsx`**, **`CoachMark.tsx`**, **`components/ui/BottomNav.tsx`**.
- `app/(app)/layout.tsx` — BottomNav ukryty `md:hidden` (desktop ma własny top bar).

**Feed desktop (punkt 7 desktop):**
- **`components/feed/desktop/DesktopFeedView.tsx`** — orchestrator: stan `mode`, `view: 'grid'|'player'`, `selectedIdx`.
- **`components/feed/desktop/DesktopTopBar.tsx`** — logo + search placeholder + linki nawigacyjne (aktywny przez `usePathname`).
- **`components/feed/desktop/DesktopSidebar.tsx`** — lewy sidebar: w Grid = selector trybu; w Player = filmstrip miniatur z heat badge.
- **`components/feed/desktop/DesktopGrid.tsx`** — 4-kolumnowa siatka `aspect-[9/12]`, hover scale + play overlay, heat badge, pasek świeżości, aktywna karta z amber ringiem.
- **`components/feed/desktop/DesktopPlayer.tsx`** — kreacja 9:16 `height: min(600px, calc(100vh-200px))`, kontrolki ← →, skróty klawiaturowe: `←/→` nawigacja, `S` zapisz, `Esc` grid.
- **`components/feed/desktop/DesktopDeepDive.tsx`** — prawy panel 280px: stats (heat, dni, scalingSince, warianty, kategoria, kraje), CTA "Zapisz do boardu", empty state.

### Decyzje techniczne

- **Tailwind v4** — `@theme inline` w CSS, brak `tailwind.config.ts`. `--color-*` → klasy `bg-*`/`text-*`/`border-*`.
- **Responsive split** — `FeedView` renderuje oba widoki jednocześnie (`md:hidden` / `hidden md:block`); każdy ma własny stan trybu i selekcji. Brak SSR/useMediaQuery — czyste CSS.
- **Desktop layout** — `flex flex-col h-full` → TopBar (shrink-0) + `flex flex-1 min-h-0` → Sidebar + main + DeepDive. `min-h-0` krytyczne dla poprawnego flex overflow.
- **Player kreacja** — `height: min(600px, calc(100vh-200px))` + `aspect-ratio: 9/16` zamiast `h-full`, żeby nie przekroczyć szerokości kontenera.
- **Hover video** — `<video>` renderuje się TYLKO gdy URL kończy się `.mp4/.webm/.mov`; dla mock (picsum) = `<img>` + wizualny overlay play.
- **Keyboard handler** — `useEffect` z `window.addEventListener('keydown')` w DesktopPlayer; ignoruje eventy gdy focus na `<input>`.
- **`scalingSince`** — `undefined` = nie skaluje; mięta pokazuje się TYLKO gdy ustawione (i w mobile, i desktop).
- **`animate(motionValue, target, opts)`** — framer-motion v12 zwraca `AnimationPlaybackControlsWithThen` (awaitable).

### Następny krok

Punkt 8 — deep-dive sheet na mobile (tap na markę), zapis do boardu (long-press), animacja heart przy save.

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
