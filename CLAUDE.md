# CLAUDE.md — SwipeSpy

Ten plik czyta Claude Code przy każdej sesji. Zawiera decyzje techniczne, których NIE wolno samodzielnie zmieniać bez pytania. Kontekst produktowy jest w `PRD.md` — przeczytaj go raz na początku.

---

## Czym jest projekt

Mobilna PWA typu "Tinder/Pinterest/TikTok dla produktów dropshippingowych i inspiracji reklamowych". Użytkownik swipe'uje produkty i kreacje konkurencji, zapisuje do boardów, widzi heat score (sygnał, że produkt zarabia). Pełny opis: `PRD.md`.

## Pozycjonowanie (rdzeń produktu)

Rdzeń SwipeSpy = zakładka Propozycje: do 20 najlepszych codziennych typów na TikTok Shop + osobno typy z reklam FB/PL. Świeże, nowe wzrosty. Nie konkurujemy rozmiarem bazy — konkurujemy selekcją, świeżością i transparentnym powodem przy każdym typie. Moat: fuzja FB×TikTok (podwójny sygnał) + lokalizacja PL po stronie reklam. Twarda zasada: realne sztuki/rank, nigdy $.

**Weryfikacja danych aktora (2026-06-18, na realnym outputcie `pro100chok/...usage`):**
- `salesVolume` = **skumulowana liczba sprzedanych sztuk (lifetime), DOKŁADNA — nie zaokrąglona** (1/85 podzielne przez 100; delty typu +1303/dzień są granularne). Wyświetlane „861,4 tys." to tylko format UI z `861419`.
- **% wzrostu od skumulowanego totalu = SZUM** (mała delta na ogromnej bazie → ~0,2%). **Nie używać %** jako sygnału ruchu.
- `searchRank` (best_sellers) **NIE jest porządkiem po sztukach** — to własny ranking relevance/momentum TikToka (rank 1 miał sv=11, rank 5 sv=128). Dlatego **rank-delta = główny, odporny na zaokrąglenie sygnał ruchu** (PRIMARY). Velocity sztukowe (`sold_7d`, wartości bezwzględne — bo dokładne) = SECONDARY, dopiero przy ≥7 dniach historii.
- `exactSoldCount`/`soldLast30Days` często `None` w trybie search → fallback na `salesVolume`. Aktor bywa **flaky w search (zwraca 0)** → dzienny silnik musi mieć retry.

**Perełki = NOWE + ROSNĄCE (nie całościowe bestsellery).** Ranking po wzroście **względnym** + świeżości PONAD absolutny lifetime, z karą za nasycenie: rank-delta > sold_7d > sold_24h (+ świeżość `tracking_started_at < 7 dni` + podwójny sygnał FB×TikTok). Nasyceni giganci (lifetime > ~100k = „znani winnerzy", teren WinningHunter/Kalodata) NIE są perełkami — tylko w ogonie „Wszystkie produkty" i pod sortem „Bestsellery". Dzień 1 (brak rank-delta/sold_7d): selekcja na `sold_24h` + świeżość + podwójny — NIE czekamy na rank-delta do renderu, NIGDY nie dopychamy do 20 bez sygnału. Logika w `tiktok_scored` (`is_gem`/`is_saturated`/`gem_score`); konsumują ją `propozycje_tiktok` i `tiktok_shop_feed`.

**Wykluczenie kategorii konsumpcyjnych (KONFIGUROWALNE).** Suplementy/kremy/maści/kosmetyki nie wchodzą do perełek, feedu Shop ani Propozycji (dopasowanie po tytule, dane US → EN+PL). Lista słów (źródło prawdy: `EXCL_RE` w `scripts/tiktok-snapshot.ts`, mirror w migracji 0020 + RPC filtruje `not excluded`): `cream, serum, ointment, balm, lotion, supplement, vitamin, collagen, capsule(s), gummies/gummy, skincare, face mask` + PL `krem, maść, balsam, suplement, witamina, kolagen`. Aby zmienić — edytuj `EXCL_RE` i przebackfilluj kolumnę `tiktok_shop_products.excluded`. Wykluczone zostają w bazie (flaga `excluded`), ale są pomijane w dziennym snapshocie.

## Aktualny etap

**RDZEŃ PRODUKTU: zakładka Propozycje + silnik TikTok Shop — ZBUDOWANE, NA PRODZIE (`swipespy.io`).** (po launch-prep; szczegóły zasad → sekcja „Pozycjonowanie" na górze)

- **Zakładka `/propozycje`** = flagowiec, pierwsza/domyślna (BottomNav + AppSidebar pierwszy slot; `/` i post-login → `/propozycje`; `AuthForm` przekierowuje tam). Typ dnia (gradient, reason chips: rank-delta mint / podwójny blue / świeży amber, sparkline dziennych sztuk) + „Najszybsze wzrosty" (karty mobile / tabela desktop) + toggle pod-feedów `[TikTok Shop]·[Reklamy·PL=wkrótce]` + track-record placeholder + stopka zaufania. Token `--blue #7DA8F5` (podwójny sygnał), Geist Mono na liczbach, reduce-motion. Profil = ikona konta w headerze (zniknął z dolnej nawigacji).
- **Dzienny silnik** `scripts/tiktok-snapshot.ts` (`npm run tiktok:snapshot`, krok w `daily.yml`): `scrapeType=search` best_sellers ×5 kategorii (`beauty/kitchen/gadgets/home/tumbler`, region=us, retry na flaky/0) = discovery + snapshot + rank w jednym. Upsert produktów (un-archive widzianych; nowe→`tracking_started_at`=dziś; flaga `excluded` po `EXCL_RE`), snapshot `(product_id,day,sales_volume,rank,category)`, archiwizacja niewidzianych >14 dni. **Koszt $0.0059/dzień (~$0.18/mc).** USA only (PL nieosiągalne — patrz pamięć `dropfeed-tiktok-shop-data-limits`).
- **Stack RPC (migracje 0016-0023):** `tiktok_movers` (velocity + rank-delta), `tiktok_double_signals` (podwójny FB×TikTok po marce), `tiktok_scored` (rdzeń: `gem_score`, `is_gem`, `is_saturated`), `propozycje_tiktok` (typ dnia + do 20), `tiktok_shop_feed` (perełki + ogon rise-first + counts). `tiktok_shop_bestsellers` (stara tabela /shop) już nieużywana.
- **Reframe perełek (DONE):** perełka = NOWE+ROSNĄCE z karą za nasycenie, NIE bestsellery. Giganci (lifetime >100k) i kategorie konsumpcyjne (`excluded`) wypadają z perełek. Dzień 1 leci na `sold_24h` + świeżość + podwójny (rank-delta od 2. dnia). NIGDY nie dopychamy do 20 bez sygnału, NIGDY modelowany $.
- **`/shop` przeframe'owany (DONE):** karuzel „Nowe perełki" (pasek-akcent mint/amber/blue) + sort bar (Nowe i rosnące domyślnie · Świeże · Największy skok · Podwójny · Bestsellery zdegradowane) + „Wszystkie produkty" rise-first (KAŻDY produkt, sygnał=wzbogacenie nie filtr) — karty mobile / tabela desktop. Deep-dive: przycisk **„Otwórz profil na TikToku"** (search po sprzedawcy — globalnie dostępny; sklep TikTok Shop jest region-locked US, z PL się nie otworzy). Licznik = „{tracked} śledzonych" / „{shown} typów dziś" (nie rozmiar bazy).
- **Darmowy feed reklam (`/feed`) — świeże najpierw + rotacja (DONE):** `feed_page` + `p_freshness_weight` (boost `created_at`, fade 14 dni) + `FEED_JITTER_AMP 12→50` → różna próbka co wejście (nie zamrożona 20). Kuracja/perełki zostają sortowane jakością — losowość tylko dla darmowego feedu. Desktop `/feed`: usunięty pusty prawy panel — pełna siatka, deep-dive marki kontekstowo + zamykalny (X).

**Stan pipeline FB (diagnoza 2026-06-18):** dzienny scrape działa; był cicho blokowany 06-15/16 przez Apify `403 "Monthly usage hard limit exceeded"` (poprzedni cykl $29 wyczerpany przez początkowy duży scrape+dev), workflow mimo to świecił na zielono. Cykl resetuje się ~17. dnia mies.; 06-18 wciągnął 131 reklam, obecny cykl $1.97/$29. **Naprawione:** `scrape.ts` robi `exit(1)` gdy wszystkie kraje padną (koniec cichych failów). Apify = **STARTER $29/mc**; TikTok engine (~$0.18) + FB scrape mieszczą się, ale pilnować limitu. Patrz pamięć `dropfeed-apify-quota-trap`.

**Co dalej / otwarte:**
- **Dojrzewanie sygnałów:** rank-delta od 06-19 (2. dzień z rank), `sold_7d` ~06-24 (≥7 dni od 06-17), akceleracja (sold_7d vs poprzednie 7d) ~07-01 (≥14 dni). Track-record (perełki sprzed 14 dni wciąż rosną) — placeholder do wypełnienia po ~2 tyg.
- **Drugi pod-feed „Reklamy · PL"** w Propozycjach = na razie „wkrótce" (logika typów z reklam FB/PL do dorobienia).
- **Podwójny sygnał** v1 = match po marce (rzadkie: PL FB vs US TikTok; Dr.Melaxin trafiony, ale wykluczony jako kosmetyk). Rozważyć match po URL/landingu później.
- **PL TikTok Shop** = świeży rynek placeholder, aż aktor zacznie wspierać region PL.
- **biweekly `reconcile`** padł 06-15 (ta sama przyczyna Apify) — zweryfikować przy następnym przebiegu.

---

**Launch-prep — branding + landing + domena (po Etapie 3 fazie 1). NA PRODZIE (`swipespy.io`).**
- **Marka: `SwipeSpy`** (rebrand z „dropfeed", 2026-06-16). Zmieniona **tylko warstwa tekstowa** (UI, landing, `<title>`/metadane, `package.json` `swipespy`, manifest, strony prawne, nagłówki CLAUDE/PRD). **Infra CELOWO została „dropfeed"** — repo `claude-droppage/dropfeed`, URL `dropfeed-phi.vercel.app`, Supabase `project_id`, klucze localStorage `dropfeed_*` — żeby nie aktualizować Google OAuth/Supabase dwa razy. **NIE „naprawiać" tego rozjazdu.**
- **Domena LIVE: `swipespy.io`** (DNS na Vercelu: `ns1/ns2.vercel-dns.com`). Supabase `site_url=https://swipespy.io`, `uri_allow_list` = localhost + swipespy.io + dropfeed-phi (Management API). Google OAuth bez zmian w konsoli Google (jej redirect → `*.supabase.co`). Stary `-phi` URL nadal działa.
- **Poczta:** `contact@swipespy.io` (ImprovMX forwarding; MX `mx1/mx2.improvmx.com` + SPF dodane w **Vercel DNS** przez `vercel dns add`). `lib/site.ts` = jedyne miejsce na e-mail + dane operatora.
- **Landing publiczny na `/`** (`components/landing/Landing.tsx`, Tailwind v4): hero (3 telefony), problem My-vs-Oni, 3 kroki, 6 funkcji, cennik Free/Pro, finalne CTA, footer. **Bramka `/`:** server-side w `app/page.tsx` (`getUser()` → zalogowany `redirect('/feed')`, niezalogowany = landing); `proxy.ts` dubluje (authed na `/` → /feed); `/` poza `PROTECTED`. CTA → `/register`, „Zaloguj się" → `/login`.
- **Podstrony prawne** (publiczne, statyczne): `/prywatnosc`, `/regulamin`, `/kontakt` (`components/legal/LegalShell.tsx` + prymitywy `H2/P/UL`). Pełny szkic PL (RODO, dopasowany do stacku) — **oznaczone jako wersja robocza, do weryfikacji prawnej**; dane operatora `[do uzupełnienia]` w `lib/site.ts`.
- **Logo/ikony:** `components/SwipeSpyLogo.tsx` (chevrony SVG + Swipe/Spy; rozmiar klasą `text-[…]` na wywołaniu, znak skaluje się przez `height:0.72em`) — nav, auth, onboarding, landing, podstrony, profil, /pro. Favicon `app/icon.svg` (ciemny kafel). **apple-icon + PWA = PNG** (`app/apple-icon.png` + `public/icon-{192,512}.png`, manifest) — bo **Next nie wspiera SVG dla `apple-icon`** (favicon `icon` przyjmuje SVG, apple nie); rastr przez `sharp` (jest w `node_modules`).
- **Zostało przed publicznym launchem:** (1) `mailer_autoconfirm=false` w Supabase (teraz `true` = dev; po włączeniu potrzebny SMTP, np. Resend, na maile systemowe); (2) potwierdzić skrzynkę/forwarding `contact@swipespy.io`; (3) dane operatora RODO w `lib/site.ts`; (4) opcjonalnie `swipespy.io` jako primary domain w Vercelu (redirect z `-phi`).

**Pułapki rozwiązane po drodze (jak sobie poradziłem):**
- *„Działa lokalnie, pada na Vercelu"* — pliki/zależności **untracked w gicie** (`lib/supabase/*`, `@supabase/ssr` w package.json/lockfile). Lokalny build zielony (pliki na dysku), Vercel buduje z gita → „Module not found". Diagnoza realnym logiem: `npx vercel inspect <dpl> --logs` (Vercel CLI zalogowany jako `primefoxbussines-4495`); status deploya: `gh api repos/.../deployments/<id>/statuses`. Fix: `git add` brakujących + commit lockfile. Patrz pamięć `dropfeed-git-tracking-trap`.
- *Bramka auth nie trzymała na prodzie* — `/feed` był statycznym prerenderem z cache CDN i omijał proxy (proxy/middleware na Vercelu nie egzekwował). Fix: twardy gate w `app/(app)/layout.tsx` (`getUser()` + `cookies()` ⇒ render dynamiczny, bez statycznego cache).
- *Build pada na prerenderze stron auth* — statyczny prerender wykonywał `createBrowserClient()` w czasie builda (brak env → rzut). Fix: `export const dynamic='force-dynamic'` w `app/(auth)/layout.tsx`.
- *Domena* — `.com` i krótkie jednowyrazowe (każdy TLD) zajęte (sprawdzone ~120 whois; heurystykę zweryfikowałem kontrolką random/known). Wybór: `swipespy.io`.
- *apple-icon 404* — SVG nieobsługiwany przez Next dla apple-icon → PNG przez `sharp`.
- *Token GitHub wygasł w trakcie sesji* — `git push` padał („could not read Username"); fix po `gh auth login` użytkownika + `gh auth setup-git`.

**Etap 3 faza 1 — UKOŃCZONA (auth + limit + paywall, BEZ Stripe).** Commity C1–C6, każdy zostawia działającą apkę. **Wszystkie na prodzie.**
- **C1 — GOTOWE:** klienci `@supabase/ssr` (`lib/supabase/{client,server,proxy}.ts`), odświeżanie sesji w `proxy.ts`, callback OAuth `app/auth/callback/route.ts`.
- **C2 — GOTOWE:** ekrany `/login` `/register` `/reset-password` (wspólny `AuthForm`), email+hasło + Google (`signInWithOAuth`), Apple slot wyłączony (TODO); sign-out w profilu.
- **C3 — GOTOWE (po naprawie):** wszystko za logowaniem. **Twardy gate jest server-side w `app/(app)/layout.tsx`** (`getUser()`→redirect `/login`; `cookies()` ⇒ trasy dynamiczne, bez statycznego cache CDN) — NIE polegać tylko na `proxy.ts` (na Vercelu proxy/middleware nie egzekwował, a `/feed` był statycznym prerenderem). **Pułapka, która wywaliła deploye C1–C3:** pliki `lib/supabase/*`, `app/auth/*` oraz wpis `@supabase/ssr` w package.json/lockfile były tylko lokalnie (untracked / niezacommitowane) → lokalny build zielony, Vercel build fail. Diagnoza: `npx vercel inspect <dpl> --logs` (CLI zalogowany). Patrz pamięć `dropfeed-git-tracking-trap`.
- **C4 — GOTOWE:** onboarding na koncie (nie localStorage). Migracja `0006_onboarding.sql`: `users.onboarded` + `users.intent` + RPC `set_onboarding(p_intent, p_niches)` (SECURITY DEFINER, dla `auth.uid()`; `selected_niches` = rozwiązane nisze). Gate onboardingu server-side (`(app)/layout` + `app/onboarding`); feed pobiera preferencje z konta (`feed/page.tsx` server → `INTENT_CONFIG` → `FeedView`). `FeedGate` usunięty; martwy localStorage z `lib/preferences.ts` usunięty.
- **C5 — GOTOWE:** schemat + RPC limitu. Migracja `0007_ad_view_limit.sql`: tabela `ad_views` (PK `user+ad+dzień` = idempotentne liczenie; RLS **tylko select**, zapis wyłącznie przez SECURITY DEFINER → user nie obejdzie limitu), RPC `consume_ad_view(p_ad_id)` (zwraca `{allowed,used,remaining,limit,unlimited}`; 20/dzień free, unlimited pro; powrót do obejrzanej nie zużywa), `ad_view_status()` (odczyt bez zużycia), `mark_pro_interest()` + `users.pro_interest_at`. Reset = dzień kalendarzowy.
- **C6 — GOTOWE:** egzekwowanie + paywall + `/pro` + licznik. Hook `lib/hooks/useAdLimit.ts` (status + `noteView`→consume przy NOWEJ reklamie w przód; status per reklama; fail-open). Mobile `SwipeDeck`: po wyczerpaniu puli nowe karty w przód = `LockedCard` (kłódka + „Ulepsz do Pro"), powrót do obejrzanych działa, swipe-save na locked zablokowany. Desktop `DesktopPlayer`: consume przy otwarciu (grid=podgląd), panel blokady zamiast kreacji. Licznik „X/20" przy feedzie + w profilu („zostało X/20" / „bez limitu", badge planu, link Ulepsz do Pro). Ekran `app/(app)/pro/page.tsx` (49 zł/mc, roczny -30% później, „Powiadom mnie"→`mark_pro_interest`). **ZERO Stripe.**
- **C7 (boardy na koncie) — ODŁOŻONE** do osobnej mini-fazy (boardy nadal w localStorage `dropfeed_boards_v1`). (Domena/branding/landing → blok „Launch-prep" na górze.)

**Etap 2 — ukończony (2026-06-13).** Feed na mock-danych z pełnym UX: swipe, gesty, boardy, deep-dive, onboarding. Architektura gotowa na podmianę Supabase.

**Etap 1 — UKOŃCZONY (kroki 1–6).** Pipeline danych działa autonomicznie (GitHub Actions). Dodatkowo zrobione: warstwa wydajności feedu, FAZA A (różnorodność/logo/deep dive), FAZA B (żywotność/automatyzacja), wdrożenie. **Produkcja: https://dropfeed-phi.vercel.app** (auto-deploy z `main`; repo publiczne `claude-droppage/dropfeed`). Feed = realne dane (media+logo z Cloudflare R2), tylko reklamy aktywne ≥7 dni; mock usunięty z bazy (kod seeda został jako fallback dev). Migracje aplikowane przez **Supabase Management API**.

- **Krok 1 — GOTOWE: schemat bazy.** Supabase, 9 tabel w `supabase/migrations/0001_init.sql`: `raw_ads`, `brands`, `products`, `ads`, `users`, `boards`, `saved_items`, `swipes`, `scrape_config`. Enumy 1:1 z `lib/types.ts`; **Row-Level Security na każdej tabeli** (treść publiczna = odczyt dla wszystkich/zapis tylko service_role; dane usera za `auth.uid()`; `raw_ads`/`scrape_config` tylko service_role); indeksy (m.in. `ads.heat_score desc`, `offer_type`, `niche`, unikaty na `ad_archive_id`); klucze obce (products/ads→brands, ads→products, boards/swipes→users, saved_items→boards/ads/products, users→auth.users); trigger `set_updated_at`; auto-tworzenie wiersza `users` przy rejestracji. Weryfikacja: `supabase/verify.sql`. Migracja idempotentna (bezpieczna do ponownego wklejenia).
- **Krok 2 — GOTOWE: seed + source.ts na Supabase.** `scripts/seed.ts` (`npm run seed`) — idempotentny seed mocków do bazy: UPSERT po deterministycznym UUID v5 z mock-id (ponowny run nie duplikuje), kolejność `brands→products→ads`, **service_role tylko server-side** (czyta `SUPABASE_SERVICE_ROLE_KEY` z `.env.local`, Node natywnie strippuje typy — zero nowych zależności). `lib/data/source.ts` rozbity na `source.supabase.ts` (zapytania do Supabase, mapowanie snake_case→camelCase, sort po `heat_score`, `ads+brands+products` → `FeedItem`, `getAdsByBrand` do deep-dive) i `source.mock.ts` (fallback). **Przełącznik `NEXT_PUBLIC_DATA_SOURCE=supabase|mock`** (domyślnie `supabase`; prefiks `NEXT_PUBLIC_`, bo deep-dive i ważenie nisz pytają bazę po stronie klienta przez anon key). Funkcje warstwy danych są teraz `async`; konsumenci na `await` (feed page = async server component; FeedGate/DeepDiveSheet/DesktopDeepDive przez `useEffect`).
- **Krok 3 — GOTOWE: Apify scraping + ingest do `raw_ads`.** Aktor `curious_coder/facebook-ads-library-scraper` (backup `apify/facebook-ads-scraper`). Edge Function `supabase/functions/ingest` (deployed, `verify_jwt=false`): webhook Apify `RUN.SUCCEEDED` → dociąga dataset z Apify API → upsert do `raw_ads` z dedup po `ad_archive_id`; auth współdzielonym sekretem (`x-webhook-secret`), zapis service_role. Sekrety jako Supabase secrets: `APIFY_TOKEN`, `INGEST_WEBHOOK_SECRET`. Pierwszy wąski run zweryfikowany e2e (beauty/PL, 4 słowa kluczowe, count=500, ~$0.32): **493 reklam w `raw_ads`** (total==distinct → dedup trzyma), 213 marek, 96% z linkiem do landinga, wszystkie `processed=false`. Webhook push potwierdzony (zasila bazę bez ręcznej interwencji). Runbook: `supabase/functions/ingest/README.md`; rejestr intencji: `supabase/seed/scrape_config_narrow.sql`.
- **Krok 4 — GOTOWE: enrichment Haiku → brands/products/ads.** `scripts/enrich.ts` (`npm run enrich`, `--limit N` na próbkę) — czyta `raw_ads` `processed=false`, fetch landinga (wsparcie `confidence`), **Claude Haiku `claude-haiku-4-5` przez Batch API** ze structured output (`output_config.format`, thinking disabled) klasyfikuje `offer_type`/`niche`/`angle`/`hook`+nazwa oferty+`confidence`, `computeHeatScore` (reuse `lib/heat.ts`), upsert `brands`(dedup po `fb_page_id`/UUID v5 z `page_id`)→`products`(dedup marka+nazwa)→`ads`(UUID v5 z `ad_archive_id`), potem `raw_ads.processed=true`. Idempotentny. Pierwszy run: **492 reklamy wzbogacone** (1 błąd batcha został `processed=false` na retry), 214 marek, 302 produkty; confidence śr ~0.8 (nazwa ukrywana gdy `<0.7`). **`creative_url`/`thumb_url` to tymczasowo URL-e Meta** (wygasają) — krok 5 przerzuci na R2. Kraje w payloadzie puste → `euCountriesCount=0` (heat bez komponentu geo). Mock usunięty z bazy (kod seeda został).
- **Krok 5 — GOTOWE: hosting kreacji na Cloudflare R2 (bez transkodowania).** `scripts/rehost.ts` (`npm run rehost`, `--limit N`, `--force`) — pobiera `creative_url`/`thumb_url` (URL-e Meta) z `ads`, wgrywa pliki as-is na R2 (S3 API przez `aws4fetch`), podmienia `creative_url`/`thumb_url` na publiczne URL-e R2 (`pub-…r2.dev`); klucze deterministyczne `creatives/<ad_archive_id>.<ext>`, `thumbs/<ad_archive_id>.jpg`; content-type ustawiany przy uploadzie (wideo gra inline, końcówka `.mp4` → feed wykrywa wideo). Idempotentny (pomija to, co już na R2; `--force` nadpisuje). Sekrety `R2_*` w `.env.local`. **456/492+ przeniesione**, 0 błędów pobierania (URL-e Meta świeże). **Obsługa błędów:** pierwszy pełny run wywrócił się na `UND_ERR_HEADERS_TIMEOUT` przy uploadzie dużego wideo (jeden rzut ubił całą pętlę) → utwardzone: `putR2` w try/catch + cała funkcja per-reklama w try/catch (timeout jednej nie przerywa batcha) → wznowienie idempotentne dociągnęło resztę. **Korekty feedu pod realne media:** dodany `Ad.thumbUrl` (+ mapowanie w `source.supabase.ts`); `DesktopGrid` używa `thumbUrl ?? creativeUrl` jako statycznej miniatury (wideo ma teraz poster zamiast `<img src=.mp4>`) + `loading="lazy"`/`decoding="async"`. **Znany dług wydajnościowy (osobny krok):** kreacje są pełnowymiarowe (2048px, ~2-5 MB) — feed ładuje się wolno mimo lazy; potrzebne **resized thumbnails** (np. 360px) + wirtualizacja + limit/paginacja w `source.ts` (patrz "co jeszcze nie istnieje").
- **Krok 6 — GOTOWE: automatyzacja (GitHub Actions).** `scripts/scrape.ts` (`npm run scrape`, `SCRAPE_COUNT=200`) czyta `scrape_config` (6 nisz PL) → broad-scrape Apify → wywołuje Edge Function `ingest`. `.github/workflows/daily.yml` (04:00 UTC): scrape→enrich→rehost→logos. `.github/workflows/biweekly.yml` (1./15. 05:00 UTC): `reconcile`. Node 24, 11 sekretów w GitHub Actions secrets.

### Co jeszcze zrobiono (poza pierwotnym planem Etapu 1)

- **Wydajność feedu:** infinite scroll (RPC `feed_page` + `useInfiniteFeed`, partie po 20, bez podwójnego fetcha), `next/image` na kreacjach z R2 (resize+webp, 5 MB→~14 KB), `content-visibility:auto` na kafelkach.
- **FAZA A — różnorodność + deep dive:** RPC `feed_page(offset,limit,per_brand,offer_types,min_age_days)` zwraca jsonb z **limitem 10 reklam/markę + przeplataniem marek** (`FEED_PER_BRAND=10`); deep dive **ad-centryczny** (logo + liczba reklam marki [COUNT] + dane TEJ reklamy: staż/format/platformy/warianty + link „FB Ad Library"; **bez gridu wszystkich reklam**); **logo marek na R2** (`scripts/logos.ts`, `brands.logo_url`, fallback inicjały). **Niedostępne w Ad Library dla reklam komercyjnych** (NIE scrapować): targeting, demografia, wiek, spend, lista krajów.
- **FAZA B — żywotność + automatyzacja:** `ads.is_active/last_seen_at/deactivated_at`; **filtr jakości `FEED_MIN_AGE_DAYS=7`** (tylko sprawdzone winnery; młodsze czekają w bazie); `scripts/reconcile.ts` (per-marka re-scrape `view_all_page_id` → is_active + martwe reklamy zostają w bazie + `brand_daily_snapshot`); **realna oś skalowania** ze snapshotów; enrich z limitem 10/markę i `last_seen_at`.
- **Wdrożenie:** repo publiczne `github.com/claude-droppage/dropfeed`, Vercel auto-deploy z `main`, env na Vercelu = 3 publiczne `NEXT_PUBLIC_*` (zero sekretów). Pełne uchwyty operacyjne: pamięć projektu (`dropfeed-deployment`, `dropfeed-pipeline-ops`).

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
- **Wydajność feedu — ZROBIONE (commity część 1-3/3).** (a) **Infinite scroll** zamiast pełnego fetcha: `getFeedPage({offset,limit,offerTypes})` + `useInfiniteFeed` (partie po `FEED_PAGE_SIZE`=20), server pobiera tylko stronę 1; desktop = sentinel/IntersectionObserver, mobile = doładowanie ~5 kart przed końcem. (b) **Podwójny fetch usunięty** (FeedGate już nie re-fetchuje całości). (c) **next/image** na kreacjach z R2 → resize do rozmiaru wyświetlania + webp (5 MB/2048px → ~14 KB w gridzie). (d) **`content-visibility:auto`** na kafelkach gridu (render tylko widocznych). Pozostało opcjonalnie: prawdziwa wirtualizacja (`@tanstack/react-virtual`) gdy feed wejdzie na dziesiątki tysięcy; sort jest heat-only (ważenie nisz + różnorodność = osobny krok logiki, niżej).
- **Odkrywanie przez śledzenie sklepów (przyszły krok).** Teraz odkrywamy po słowach kluczowych (`scrape_config`, 14 nisz × rynki). Docelowo: scrapować **WSZYSTKIE reklamy znanych sklepów/marek** (po `fb_page_id` przez `view_all_page_id`), nie tylko po słowach — pełniejsze łapanie nowych produktów marek, które już mamy w bazie. (Infrastruktura per-page już jest w `reconcile.ts`.)

### Następny krok

Etap 1 ukończony + **logika feedu** (Część 1: seed-jitter rotacja + miękkie ważenie nisz + różnorodność co 10, RPC `feed_page`) + **geografia/język/nisze** (Część 2: 14 nisz × PL/US/UK/DE/FR/ES, `ads.country`/`ads.language`, rotacja nisz×rynków). Otwarte kierunki: **odkrywanie przez śledzenie sklepów** (wyżej); filtry UI język/kraj (dane już zbierane); **Etap 3** (auth + konta/boardy per user, migracja z localStorage, limit swipe'ów); **Etap 4** (monetyzacja: freemium, Stripe, paywall); skalowanie scrape (tiered).

## Roadmapa po launchu + Silnik odkrywania (plan)

> UI szablonów (Produkty, deep-dive produktu, TikTok Shop PL/USA, przełącznik źródła FB/TikTok, 5-tab shell) jest już w apce na **danych mockowych** za interfejsem `lib/data/source` (kroki D1–D6). Feed reklam zostaje na **realnych** danych. Backend nowych ekranów wpinamy fazami — mock → realne za **tym samym interfejsem**, zero zmian w UI. `source.supabase.ts` deleguje te funkcje do mocka z `// TODO`.

### 1. Fazy (kolejność wdrażania danych)
- **Faza 1 — Produkty FB:** ekran Produkty + deep-dive + sygnały odkrywania. Źródło = istniejący scrape FB (`ads` + `brands` + `products` + `brand_daily_snapshot`). Prawie darmowe ponad to, co już pobieramy.
- **Faza 2 — TikTok ads:** reklamy TikTok do feedu (źródło TikTok w przełączniku).
- **Faza 3 — TikTok Shop USA:** bestsellery z realnymi liczbami sprzedaży.
- **Faza 4 — TikTok Shop PL:** świeży rynek (start 15.06), first-mover.

### 2. Silnik odkrywania (nie-generyczne produkty)
Cel: nie „losowe winnery", tylko produkty z realnym sygnałem. Liczone z danych, które już mamy:
- **Momentum / akceleracja** — przyrost reklam/wariantów w czasie ze `brand_daily_snapshot` (np. „▲ +9 reklam / 5 dni").
- **Cross-market** — wygrywa za granicą, jeszcze nie w PL (z `ads.country`/`ads.language`): „🇺🇸→🇵🇱 wchodzi do PL".
- **Seed-and-expand** — z `reconcile` (per-page re-scrape `view_all_page_id`) rozszerzamy znane marki/sklepy.
- **Klastrowanie** — po URL docelowym (landing) + liczbie reklamodawców („23 sklepy reklamują ten produkt") = sygnał realnej sprzedaży.
- **Cross-source (później)** — FB rośnie × TikTok sprzedaje = najmocniejszy sygnał.
Zasada: zacznij od lekkich (liczby/daty/URL); image-embedding i cross-source dokładaj później.

### 3. Zasada danych: twarde fakty TAK, estymaty NIE
- **TAK** (pokazujemy): sprzedane sztuki, ceny, wyświetlenia/lajki/komentarze, liczba reklam, staż.
- **NIE** (nie zgadujemy): revenue $ estymowane, „product score", dane SimilarWeb-style (estymowany ruch). Lepiej mniej, ale prawdziwie. (Zieleń w UI = realna sprzedaż TikTok Shop; bursztyn = heat FB.)

### 4. Model danych TikTok Shop (Faza 3)
- **Warstwa LISTA** — tania, szeroka, odświeżana ~tygodniowo (bestsellery + liczby sprzedaży).
- **Warstwa DEEP (on-demand)** — dopiero gdy user wejdzie w produkt; na start **tylko wideo** (bez twórców/recenzji); cache ~2 tygodnie; pre-warm top ~20–50.
- **Embed TikToka = 0 hostingu wideo** — trzymamy tylko ID + metadane, odtwarzanie przez embed (brak kosztów wideo, inaczej niż R2 dla FB).

### 5. Model kosztów
- **Faza 1** — prawie darmowa ponad scrape FB (produkty/deep-dive/sygnały = obliczenia na już pobieranych danych).
- **TikTok Shop** — ~$10–20/mc. **Start łącznie** — ~$40–55/mc.
- **ZASADA: zmierz na małym przebiegu przed skalowaniem** (jak pierwszy wąski scrape FB).

### 6. Backend per funkcja
- **Feed / Produkty / deep-dive / sygnały** — jeden scrape FB + obliczenia (snapshots, geo, klastrowanie). Bez nowego pipeline'u.
- **TikTok Shop** — osobny pipeline (Faza 3): LISTA + DEEP on-demand + embed.
- **Stripe** — Supabase Edge Functions (webhook + checkout + portal). Osobny wątek (Etap 4).

## Stack (decyzje podjęte — nie zmieniać bez pytania)

- **Framework:** Next.js (App Router) jako PWA. Powód: web-first, najszybsza droga na telefon, twórca zna web. Ścieżka natywna PÓŹNIEJ: ten sam kod opakowany w Capacitor → App Store/Google Play (nie budujemy osobnych aplikacji natywnych; pisz kod tak, by dał się opakować — bez API niedostępnych w webview).
- **Język:** TypeScript wszędzie, tryb strict.
- **Style:** Tailwind CSS v4. Design tokens (niżej) jako zmienne CSS + `@theme inline` w `styles/tokens.css`.
- **Gesty swipe:** `@use-gesture/react` + `framer-motion` (drag, spring, threshold). Nie wymyślać własnej fizyki swipe'a.
- **Backend (od Etapu 1):** Supabase — Postgres + Auth + Storage + Edge Functions.
- **Auth:** Supabase Auth — Google OAuth (główne), magic link, email+hasło fallback. Nie budować auth od zera. Klienci `@supabase/ssr` w `lib/supabase/{client,server,proxy}.ts`; sesja odświeżana w `proxy.ts` (Next 16, dawniej middleware); callback OAuth `app/auth/callback/route.ts`. **⚠️ DEV: potwierdzenie e-mail WYŁĄCZONE** (`mailer_autoconfirm=true` w Supabase Auth) — **WŁĄCZYĆ PRZED PRODEM** (Management API `PATCH /config/auth {"mailer_autoconfirm": false}` lub dashboard). `uri_allow_list` = localhost + prod.
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
