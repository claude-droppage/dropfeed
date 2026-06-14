# CLAUDE.md — dropfeed

Ten plik czyta Claude Code przy każdej sesji. Zawiera decyzje techniczne, których NIE wolno samodzielnie zmieniać bez pytania. Kontekst produktowy jest w `PRD.md` — przeczytaj go raz na początku.

---

## Czym jest projekt

Mobilna PWA typu "Tinder/Pinterest/TikTok dla produktów dropshippingowych i inspiracji reklamowych". Użytkownik swipe'uje produkty i kreacje konkurencji, zapisuje do boardów, widzi heat score (sygnał, że produkt zarabia). Pełny opis: `PRD.md`.

## Aktualny etap

**Etap 2 — ukończony (2026-06-13).** Feed na mock-danych z pełnym UX: swipe, gesty, boardy, deep-dive, onboarding. Architektura gotowa na podmianę Supabase.

**Etap 1 — w toku (pipeline danych).** Kroki 1–5 gotowe; pozostał krok 6 (automatyzacja). Decyzje orkiestracji zapisane: **model push** (Apify Schedule → webhook → Edge Function), wideo na R2 **bez transkodowania na start**, **pierwszy run wąski** przez `scrape_config`. **Feed pokazuje realne dane** (492 reklamy, media z Cloudflare R2); mock usunięty z bazy po kroku 4 (kod seeda został jako fallback dev).

- **Krok 1 — GOTOWE: schemat bazy.** Supabase, 9 tabel w `supabase/migrations/0001_init.sql`: `raw_ads`, `brands`, `products`, `ads`, `users`, `boards`, `saved_items`, `swipes`, `scrape_config`. Enumy 1:1 z `lib/types.ts`; **Row-Level Security na każdej tabeli** (treść publiczna = odczyt dla wszystkich/zapis tylko service_role; dane usera za `auth.uid()`; `raw_ads`/`scrape_config` tylko service_role); indeksy (m.in. `ads.heat_score desc`, `offer_type`, `niche`, unikaty na `ad_archive_id`); klucze obce (products/ads→brands, ads→products, boards/swipes→users, saved_items→boards/ads/products, users→auth.users); trigger `set_updated_at`; auto-tworzenie wiersza `users` przy rejestracji. Weryfikacja: `supabase/verify.sql`. Migracja idempotentna (bezpieczna do ponownego wklejenia).
- **Krok 2 — GOTOWE: seed + source.ts na Supabase.** `scripts/seed.ts` (`npm run seed`) — idempotentny seed mocków do bazy: UPSERT po deterministycznym UUID v5 z mock-id (ponowny run nie duplikuje), kolejność `brands→products→ads`, **service_role tylko server-side** (czyta `SUPABASE_SERVICE_ROLE_KEY` z `.env.local`, Node natywnie strippuje typy — zero nowych zależności). `lib/data/source.ts` rozbity na `source.supabase.ts` (zapytania do Supabase, mapowanie snake_case→camelCase, sort po `heat_score`, `ads+brands+products` → `FeedItem`, `getAdsByBrand` do deep-dive) i `source.mock.ts` (fallback). **Przełącznik `NEXT_PUBLIC_DATA_SOURCE=supabase|mock`** (domyślnie `supabase`; prefiks `NEXT_PUBLIC_`, bo deep-dive i ważenie nisz pytają bazę po stronie klienta przez anon key). Funkcje warstwy danych są teraz `async`; konsumenci na `await` (feed page = async server component; FeedGate/DeepDiveSheet/DesktopDeepDive przez `useEffect`).
- **Krok 3 — GOTOWE: Apify scraping + ingest do `raw_ads`.** Aktor `curious_coder/facebook-ads-library-scraper` (backup `apify/facebook-ads-scraper`). Edge Function `supabase/functions/ingest` (deployed, `verify_jwt=false`): webhook Apify `RUN.SUCCEEDED` → dociąga dataset z Apify API → upsert do `raw_ads` z dedup po `ad_archive_id`; auth współdzielonym sekretem (`x-webhook-secret`), zapis service_role. Sekrety jako Supabase secrets: `APIFY_TOKEN`, `INGEST_WEBHOOK_SECRET`. Pierwszy wąski run zweryfikowany e2e (beauty/PL, 4 słowa kluczowe, count=500, ~$0.32): **493 reklam w `raw_ads`** (total==distinct → dedup trzyma), 213 marek, 96% z linkiem do landinga, wszystkie `processed=false`. Webhook push potwierdzony (zasila bazę bez ręcznej interwencji). Runbook: `supabase/functions/ingest/README.md`; rejestr intencji: `supabase/seed/scrape_config_narrow.sql`.
- **Krok 4 — GOTOWE: enrichment Haiku → brands/products/ads.** `scripts/enrich.ts` (`npm run enrich`, `--limit N` na próbkę) — czyta `raw_ads` `processed=false`, fetch landinga (wsparcie `confidence`), **Claude Haiku `claude-haiku-4-5` przez Batch API** ze structured output (`output_config.format`, thinking disabled) klasyfikuje `offer_type`/`niche`/`angle`/`hook`+nazwa oferty+`confidence`, `computeHeatScore` (reuse `lib/heat.ts`), upsert `brands`(dedup po `fb_page_id`/UUID v5 z `page_id`)→`products`(dedup marka+nazwa)→`ads`(UUID v5 z `ad_archive_id`), potem `raw_ads.processed=true`. Idempotentny. Pierwszy run: **492 reklamy wzbogacone** (1 błąd batcha został `processed=false` na retry), 214 marek, 302 produkty; confidence śr ~0.8 (nazwa ukrywana gdy `<0.7`). **`creative_url`/`thumb_url` to tymczasowo URL-e Meta** (wygasają) — krok 5 przerzuci na R2. Kraje w payloadzie puste → `euCountriesCount=0` (heat bez komponentu geo). Mock usunięty z bazy (kod seeda został).
- **Krok 5 — GOTOWE: hosting kreacji na Cloudflare R2 (bez transkodowania).** `scripts/rehost.ts` (`npm run rehost`, `--limit N`, `--force`) — pobiera `creative_url`/`thumb_url` (URL-e Meta) z `ads`, wgrywa pliki as-is na R2 (S3 API przez `aws4fetch`), podmienia `creative_url`/`thumb_url` na publiczne URL-e R2 (`pub-…r2.dev`); klucze deterministyczne `creatives/<ad_archive_id>.<ext>`, `thumbs/<ad_archive_id>.jpg`; content-type ustawiany przy uploadzie (wideo gra inline, końcówka `.mp4` → feed wykrywa wideo). Idempotentny (pomija to, co już na R2; `--force` nadpisuje). Sekrety `R2_*` w `.env.local`. **456/492+ przeniesione**, 0 błędów pobierania (URL-e Meta świeże). **Obsługa błędów:** pierwszy pełny run wywrócił się na `UND_ERR_HEADERS_TIMEOUT` przy uploadzie dużego wideo (jeden rzut ubił całą pętlę) → utwardzone: `putR2` w try/catch + cała funkcja per-reklama w try/catch (timeout jednej nie przerywa batcha) → wznowienie idempotentne dociągnęło resztę. **Korekty feedu pod realne media:** dodany `Ad.thumbUrl` (+ mapowanie w `source.supabase.ts`); `DesktopGrid` używa `thumbUrl ?? creativeUrl` jako statycznej miniatury (wideo ma teraz poster zamiast `<img src=.mp4>`) + `loading="lazy"`/`decoding="async"`. **Znany dług wydajnościowy (osobny krok):** kreacje są pełnowymiarowe (2048px, ~2-5 MB) — feed ładuje się wolno mimo lazy; potrzebne **resized thumbnails** (np. 360px) + wirtualizacja + limit/paginacja w `source.ts` (patrz "co jeszcze nie istnieje").
- **Pozostały krok Etapu 1** (szczegóły zadania: sekcja "Drugie zadanie" niżej):
  - **(6) Automatyzacja** — Apify Schedule (np. codziennie 04:00) + webhook do Edge Function; łańcuch `ingest → enrich → rehost` (rehost zaraz po scrape, bo URL-e Meta wygasają); rozszerzenie zakresu w `scrape_config` po walidacji wąskiego runu.

### Co istnieje — kompletna lista

**Fundament:**
- Next.js 16.2.9 + React 19 + TypeScript strict + Tailwind v4.3.1 + framer-motion 12 + @use-gesture/react 10 + lucide-react
- `lib/types.ts` — komplet encji: `Brand`, `Product`, `Ad`, `User`, `Board`, `SavedItem`, `Swipe`, `FeedItem`
- `lib/data/mock.ts` — 30 reklam, 10 brandów, 27 produktów; placeholder images: `picsum.photos/seed/{id}/360/640`
- `lib/data/source.ts` — abstrakcja danych z `getFeedItems()`, `getAdsByBrand()`, `getNicheWeightedItems()`
- `lib/heat.ts` — `computeHeatScore(input)`, 5 składników
- `styles/tokens.css` — CSS vars + `@theme inline` dla Tailwind v4

**Feed — mobile:**
- `SwipeDeck` — silnik gestów (@use-gesture) + framer-motion; góra/dół = slide, prawo = save flyoff z `SaveFeedback`, lewo = skip; długi przytrzymanie 450ms = `BoardPickerSheet`
- `SwipeCard` — pełnoekranowy TikTok-style: kreacja, scrim, top data bar, pasek akcji, brand info na dole; tap na markę/ArrowUpRight = deep dive
- `FeedView` — split `md:hidden`/`hidden md:block`; `initialMode` i `initialOfferTypes` z onboardingu
- `FeedGate` — sprawdza preferencje w localStorage, przekierowuje na `/onboarding` jeśli brak; aplikuje niche weighting
- `ModeToggle`, `CoachMark`, `BottomNav` (ukryty na desktop)

**Feed — desktop:**
- `DesktopFeedView` — orchestrator: `mode`, `view: 'grid'|'player'`, `selectedIdx`
- `DesktopGrid` — 4-kol. siatka, hover play overlay, amber ring na aktywnej
- `DesktopPlayer` — kreacja 9:16, skróty `←/→`, `S` zapisz, `Esc` grid
- `DesktopSidebar`, `DesktopTopBar`, `DesktopDeepDive` (używa `BrandDeepDive`)

**Deep-dive (profil marki):**
- `components/deepdive/BrandDeepDive` — shared: nagłówek, IG followers, chipy (sklep/IG), oś skalowania (7 słupków, bursztyn = aktywne tygodnie), grid reklam marki 3-kol.
- `components/deepdive/DeepDiveSheet` — mobile bottom sheet (spring, 88dvh, AnimatePresence); otwierany tapem na markę lub ikonę deep dive

**Boardy:**
- `lib/boards.ts` — `useBoards()` z localStorage (`dropfeed_boards_v1`); `saveToLastBoard`, `createBoard`, `saveToBoard`, `getBoardItems`, `getBoardItemCount`
- `BoardCard` — 2×2 miniatura; `CreateBoardSheet` — spring sheet z inputem; `BoardPickerSheet` — wybór boardu + inline create
- `SaveFeedback` — serce 72px + toast "Zapisano · [nazwa]" (AnimatePresence)
- `/boards` — 2-kol. grid z `+` i empty state; `/boards/[id]` — 3-kol. grid zapisanych kreacji z heat badge

**Onboarding:**
- `lib/preferences.ts` — `IntentKey`, `UserPreferences`, `INTENT_CONFIG` (intent → feedMode + offerTypes), `ONBOARDING_NICHES` z 10 opcjami i mapowaniem na `Niche[]`, `loadPreferences`/`savePreferences` (localStorage `dropfeed_prefs_v1`), `resolveNiches()`
- `app/onboarding/page.tsx` — krok 1: intencja (4 opcje, radio-style, amber); krok 2: 10 chipów nisz, multi-select; slide animacja między krokami; "pomiń" zapisuje bez nisz

**Szkielety:**
- `/discover` — search bar placeholder + trending pills + siatka nisz
- `/profile` — avatar + badge planu + lista opcji

### Decyzje techniczne

- **Tailwind v4** — `@theme inline` w CSS, brak `tailwind.config.ts`. `--color-*` → klasy `bg-*`/`text-*`/`border-*`.
- **Responsive split** — `FeedView` renderuje oba widoki jednocześnie (`md:hidden`/`hidden md:block`); brak SSR/useMediaQuery — czyste CSS.
- **Desktop layout** — `flex flex-col h-full` + `flex flex-1 min-h-0`. `min-h-0` krytyczne dla flex overflow.
- **Player kreacja** — `height: min(600px, calc(100vh-200px))` + `aspect-ratio: 9/16`.
- **Hover video** — `<video>` TYLKO gdy URL kończy się `.mp4/.webm/.mov`; picsum = `<img>` + overlay.
- **`animate(motionValue, target, opts)`** — framer-motion v12: awaitable `AnimationPlaybackControlsWithThen`.
- **`saveToLastBoard` sync return** — czyta `store` snapshot z render-closure; NIE closure-mutation w setState.
- **Long-press** — `holdTimerRef` + `clearTimeout` w `first`, `last` i gdy `mx < 60`.
- **Board detail params** — `use(params)` z React 19 (Next.js 16 App Router, params jako Promise).
- **`ads` import w pages** — bezpośredni z `@/lib/data/mock` TYLKO do resolucji thumbnail URL; feed czyta przez `source.ts`.
- **FeedGate + onboarding redirect** — klient sprawdza localStorage po montażu; serwer pre-fetches items, klient re-sortuje wg nisz.
- **localStorage jako placeholder** — `useBoards` (`dropfeed_boards_v1`) i preferencje onboardingu (`dropfeed_prefs_v1`) to **świadomy placeholder na czas mocków**. W Etapie 3 przechodzą na Supabase per user. Nie wbudowywać logiki zakładającej localStorage na zawsze — klucze i struktury powinny być łatwe do wymiany.

### Co jeszcze nie istnieje

- Coach mark z objaśnieniem ikon górnego paska (ikony bez podpisów przy pierwszej karcie)
- Pełne UX desktopu (brak testów cross-browser, brak finalizacji)
- **Logika feedu NIE jest kompletna (rozjazd z PRD §11).** Zaimplementowane jest tylko **grupowanie**: `getNicheWeightedItems` przesuwa preferowane nisze na górę kolejki. NIE ma **wstrzykiwania różnorodności** (PRD §11 "KRYTYCZNE: feed nigdy nie pokazuje 100% jednej kategorii, co 10-20 pozycji coś innego") ani **miękkiego ważenia** na sygnałach swipe (save/skip — "częściej/rzadziej, nie tak/nie"). Obecny sort jest twardszy niż zakłada PRD. Dodatkowo **zmiana filtra `offerType` w locie z poziomu feedu** (PRD §11 pkt 2) — do potwierdzenia/dorobienia: `initialOfferTypes` jest przekazywane z onboardingu, ale przełączanie w trakcie sesji jest nieweryfikowane.
- **Dług wydajnościowy feedu (do osobnego kroku).** Przy realnych danych feed ładuje się wolno, bo: (a) kreacje to **pełnowymiarowe pliki** z R2 (2048px, ~2-5 MB) — brak resized thumbnails (np. 360px); (b) `source.ts` pobiera **wszystkie** reklamy bez limitu/paginacji; (c) `FeedGate` re-fetchuje całość po stronie klienta przy ważeniu nisz (podwójny fetch); (d) brak wirtualizacji listy. `loading="lazy"` już dodane (częściowa mitygacja). Do zrobienia: thumbnails + limit/paginacja + usunięcie podwójnego fetcha + wirtualizacja.
- **Krok 6 Etapu 1** (automatyzacja) — pozostały; kroki 1–5 gotowe, patrz "Aktualny etap".

### Następny krok

Etap 1, krok 6 — automatyzacja: Apify Schedule → webhook → łańcuch `ingest → enrich → rehost` (cyklicznie, codziennie) + rozszerzenie `scrape_config`. Kroki 1–5 gotowe — patrz "Aktualny etap". Szczegóły: sekcja "Drugie zadanie" poniżej.

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

## Drugie zadanie dla Claude Code (Etap 1 — pipeline danych)

1. Supabase: schema z PRD sekcja 10, Row-Level Security, migracje przez `supabase/migrations/`.
2. Apify scraper — **model PUSH**: harmonogram po stronie Apify (Apify Schedule, np. codziennie 04:00) odpala aktora `curious_coder/facebook-ads-library-scraper` (backup: `apify/facebook-ads-scraper`). Po runie Apify wysyła **webhook** do Supabase Edge Function, która pobiera dataset z Apify API i robi `upsert` do `raw_ads` (dedup po `ad_archive_id`). **NIE model pull** — Supabase nie woła aktora ani nie czeka na scraping (Edge Functions mają limit czasu, scraping trwa za długo). **Pierwszy run wąsko** przez `scrape_config` (1-2 nisze, ograniczone kraje, ~500 reklam) — walidacja kosztu i jakości enrichmentu przed rozszerzeniem.
3. Enrichment: Edge Function (Claude Haiku, batch) przetwarza wiersze `raw_ads` z `processed = false` — klasyfikacja `offer_type`, `niche`, `angle`, `hook`; landing-page fetch → `confidence` (**nazwa oferty ukrywana w UI gdy `confidence < 0.7`**, zgodnie z kodem feedu); wynik trafia do tabeli `ads`, `raw_ads.processed = true`.
4. Pobieranie kreacji do R2 — **na start BEZ transkodowania**: pobierz wideo/grafikę z Meta i zapisz na Cloudflare R2 jak pobrane (widoczne w feedzie od pierwszego runu; R2 = zero egress). Zapisz `creative_url` (R2) i `thumb_url` (poster w R2); oryginalny link Meta trzymaj tylko jako referencję/fallback, nie do odtwarzania w feedzie. **Transkodowanie/kompresja do ~3-5 MB = późniejsza optymalizacja** (własny worker z `ffmpeg`, NIE Cloudflare Stream — liczy za minuty oglądane), NIE blokuje tego kroku.
5. Heat score: `computeHeatScore()` wywołane po enrichmencie, wynik zapisany w kolumnie `heat_score`.
6. `lib/data/source.ts`: podmień implementację na Supabase client — interfejs bez zmian, UI nic nie wie.

@AGENTS.md
