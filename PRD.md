# dropfeed — Product Requirements Document

> Robocza nazwa: **dropfeed**. Aplikacja typu "Tinder/Pinterest/TikTok dla produktów dropshippingowych i inspiracji biznesowych". Wersja dokumentu: v2. Język tego dokumentu: PL.

---

## 1. Wizja w jednym zdaniu

Aplikacja mobilna (PWA), w której scrollujesz/swipe'ujesz to, co aktualnie reklamuje się w socialach — produkty fizyczne i cyfrowe, aplikacje, kursy, usługi, marki — jak TikToka: z przyjemnością i dopaminą. Przy okazji budujesz swoją bazę inspiracji i widzisz twarde sygnały, że dany produkt/reklama realnie zarabia.

## 2. Problem

Dziś research robi się ręcznie: scrollowanie Instagrama w poszukiwaniu aktywnych reklam, sprawdzanie profili, przeglądanie YouTube, klikanie po nudnych dashboardach narzędzi spy (Minea, WinningHunter, Foreplay). Te narzędzia mają dane, ale zbudowane są jak Excel — siadasz do nich jak do pracy. Nikt nie zrobił z tego konsumenckiego, przyjemnego doświadczenia, które odpalasz wieczorem na telefonie.

## 3. Insight / przewaga

Warstwa danych jest rozwiązanym problemem (publiczne Meta Ad Library + TikTok Creative Center). Nierozwiązany jest **format**: swipe + dopamina + zapisywanie do kolekcji (boardy), na danych zamkniętych dziś w nudnych narzędziach B2B. To ten sam ruch, który Tinder zrobił z randkami, a Duolingo z nauką języków.

Dodatkowa przewaga twórcy: gotowa społeczność (program mentoringowy dropshippingu) i kanał YouTube jako pierwsi użytkownicy i kanał dystrybucji.

## 4. Avatary i strategia wejścia

**Zasada: produkt szeroki, dystrybucja wąska.** Architektura i feed obsługują od pierwszego dnia każdy typ reklamodawcy (produkty fizyczne, cyfrowe, aplikacje, kursy, usługi). Ale komunikacja launchowa celuje w jeden segment, gdzie twórca ma zasięg i zaufanie.

### Beachhead (launch) — Dropshipper-poszukiwacz
Szuka produktu, który "pójdzie". Chce widzieć: produkt, jak długo reklama działa, czy się skaluje, ile ma wariantów. Pierwsi użytkownicy: społeczność programu mentoringowego + widzowie YT twórcy.

### Avatar docelowy (ekspansja, bez zmian w kodzie) — Każdy szukający pomysłów
Twórcy, marketerzy, ludzie szukający pomysłu na biznes, founderzy badający strategie innych reklamodawców. Interesuje ich: co działa w reklamie teraz, jakie angle, jakie kategorie rosną — niezależnie czy to gadżet, apka czy kurs.

> Decyzja produktowa: jeden mechanizm swipe'a, dwa tryby feedu przełączane u góry ekranu. Tryb "Produkty" akcentuje samą ofertę (co sprzedają, kategoria, sygnały skalowania). Tryb "Inspiracje" akcentuje kreację, angle i markę. Dane pod spodem te same, inny akcent. Dodatkowo filtr kategorii oferty: fizyczne / cyfrowe / aplikacje / usługi / kursy.

## 5. Zakres v1 (MVP)

**JEST w MVP:**
- Logowanie (Google OAuth + magic link)
- Onboarding: wybór 3–5 nisz
- Feed swipe (dwa tryby: Produkty / Inspiracje)
- Karta produktu z heat score i danymi reklamy
- Gesty: lewo = pomiń, prawo = zapisz, góra = deep dive
- Boardy (kolekcje zapisanych pozycji, jak Pinterest)
- Deep dive: profil marki (wszystkie jej reklamy, sklep, IG, oś skalowania)
- Limit darmowych swipe'ów / dzień + paywall Pro
- Pełny model danych: reklama + produkt + sklep + IG

**NIE MA w MVP (backlog):**
- Powiadomienia push / alerty "produkt zaczął skalować"
- Eksport boardów
- Współdzielenie boardów / funkcje społecznościowe
- Wersja EN (architektura gotowa pod i18n, ale stringi tylko PL na start)
- Aplikacja natywna (na start PWA)

## 6. Mapa ekranów

```
AUTH
  Splash
  Login / Register        (Google OAuth, magic link, email+hasło fallback)
  Onboarding (wybór nisz)

APP (bottom nav: Feed · Boardy · Odkrywaj · Profil)
  Feed         główny ekran, swipe, przełącznik trybu Produkty/Inspiracje
  Deep dive    (swipe w górę z karty) profil marki + jej reklamy + sklep + IG + oś skalowania
  Boardy       lista kolekcji → widok boardu (grid jak Pinterest)
  Odkrywaj     wyszukiwarka marek/nisz + ranking "najgorętsze teraz"
  Profil       konto, plan, limit swipe'ów, ustawienia, wylogowanie
```

## 7. Kluczowe przepływy użytkownika

**Pierwsze uruchomienie:**
Splash → Logowanie (1 klik Google) → Onboarding dwukrokowy (max ~30 sekund) → od razu spersonalizowany feed. Cel: "aha" w pierwszych 10 sekundach.

Onboarding — **krok 1** (jeden wybór, intencja):
- Produktów do sprzedania (dropshipping) → tryb Produkty, filtr: physical
- Pomysłów cyfrowych (apki, kursy, produkty cyfrowe, usługi) → tryb Produkty, filtr: digital+app+service+course
- Inspiracji reklamowych (angle, hooki, kreacje) → tryb Inspiracje, bez filtra
- Rozglądam się ogólnie → tryb Produkty, bez filtra

Onboarding — **krok 2** (3-5 wyborów, nisze): beauty, zdrowie i fitness, dom i kuchnia, pet, gadżety tech, dziecko i mama, motoryzacja, outdoor i sport, biżuteria i akcesoria, biuro i organizacja.

To podwaliny pod platformę "dla każdego" — nie tylko dropshipperów. Intencja ustawia punkt startowy feedu; user może go zmienić w każdej chwili jednym tapnięciem.

**Codzienny loop (retencja):**
Otwiera app → feed już dostrojony → swipe'uje → zapisuje ciekawe do boardu → na zainteresowaniu robi deep dive → wraca następnego dnia. Limit darmowych swipe'ów buduje głód i wraca jutro (albo upgrade).

**Konwersja na Pro:**
Po wyczerpaniu dziennego limitu lub przy próbie deep dive ponad limit → paywall z jasną wartością (nielimitowane swipe'y, pełne deep dive'y, alerty skalowania, eksport).

## 8. Anatomia ekranu feedu (format pełnoekranowy, jak TikTok) — FINALNA

Kreacja wypełnia **cały ekran**. Dwa równoprawne formaty: **wideo** (9:16, autoplay bez dźwięku, tap = dźwięk on/off) i **statyczna grafika** (jak post IG — bez timera, user sam przewija). Dane jako nakładki:

- Sama góra: zakładki (Inspiracje / Produkty / Gorące)
- **Górny pasek danych** (pod zakładkami, jeden rząd, same ikony + liczby, bez opisów): pill Heat (bursztyn) · ikona kategorii oferty (pudełko=fizyczny, chmura=cyfrowy, telefon=aplikacja, czapka=kurs, klucz=usługa) · zegar + "47d" (wiek tej reklamy) · stos + "12" (aktywne reklamy marki) · ikona formatu (wideo/grafika)
- Prawa krawędź: pasek akcji: zapisz do boardu, deep dive, **strona** (nie "sklep" — przy kursie/aplikacji "sklep" nie pasuje)
- Lewy dół (minimalny): avatar + nazwa marki (tap = deep dive) + mały miętowy pill "skaluje" (tylko gdy marka aktywnie skaluje), pod spodem nazwa oferty
- Sam dół: pasek "świeżości" reklamy

**Coach mark (pierwsze uruchomienie):** ikony bez podpisów wymagają jednorazowych dymków przy pierwszej karcie ("tyle dni chodzi ta reklama", "tyle aktywnych reklam ma ta marka"). Dodatkowo tap na pill pokazuje podpis. Po pierwszej sesji karta zostaje czysta.

**Gesty (zgodne z nawykami z sociali):**
- **góra/dół** → następna/poprzednia kreacja (jak TikTok)
- **w prawo** → zapisz do boardu (przytrzymanie = wybór boardu)
- **w lewo** → pomiń (sygnał "mniej takich")
- **tap na markę lub ikona deep dive** → panel marki wysuwany od dołu
- **tap na wideo** → dźwięk on/off

**Tryb Inspiracje** — ten sam ekran; pasek danych akcentuje angle/hook i format kreacji zamiast kategorii oferty.

**Sortowanie feedu (drugi przełącznik):** "Gorące teraz" (świeże reklamy, które właśnie zaczęły skalować) vs "Sprawdzone winnery" (reklamy długo żyjące, najwyższy heat).

**Platformy:** jedna aplikacja (PWA), dwa układy. Mobile (<768px) = pełnoekranowy feed. Desktop (≥768px) = **dwa widoki**: (1) **Grid** — domyślny, ściana miniatur jak Pinterest, najechanie myszką odtwarza wideo; (2) **Player** — klik w miniaturę otwiera kreację w pionie 9:16 na środku z panelem pełnych danych po prawej, nawigacja scrollem/strzałkami, skróty: S = zapisz, Esc = powrót do gridu. Wąski pasek nawigacji z lewej (jak TikTok web). Wzorzec wizualny: `design-reference.html`.

## 9. Heat Score — logika (sekret produktu)

Heat score to złożony sygnał "to realnie działa i zarabia". Skala 0–100. Liczony przy enrichmencie, przeliczany codziennie.

| Składnik | Waga | Co mierzy | Skąd |
|---|---|---|---|
| Długość życia reklamy | 40% | dni nieprzerwanej aktywności (log: 60+ dni = max) | data startu z Ad Library |
| Tempo skalowania | 25% | przyrost nowych wariantów reklam w ostatnich 14 dniach | grupowanie reklam advertisera |
| Liczba wariantów | 15% | ile różnych kreacji na ten sam produkt (więcej = testują i wygrywają) | grupowanie kreacji |
| Zasięg geograficzny | 10% | liczba krajów EU, gdzie reklama leci | pole countries |
| Aktualność | 10% | czy nadal aktywna teraz + bonus dla "młoda, ale już skaluje" | status aktywności |

Zasada: nikt nie pali budżetu 60 dni na stratną reklamę — długość życia to najlepszy pojedynczy proxy na "winner". Reszta składników dostraja.

> Implementacja: czysta funkcja `computeHeatScore(input)` w `lib/heat.ts`. Na etapie mock-danych zwraca wartości policzone z pól mocka, żeby UI pokazywał realistyczne liczby.

## 10. Model danych (logiczny)

Pełny model: reklama → produkt → sklep → IG. Relacje:

- **brand** (marka/advertiser): nazwa, FB page id, IG handle, IG followers, URL sklepu, kraj, avatarInitials
- **product** (oferta): nazwa, typ oferty (`offerType`: physical/digital/app/service/course/other), nisza, kategoria, cena w sklepie (jeśli dostępna), link do oferty, miniatura, `confidence` (0–1)
- **ad** (kreacja): `format` (video/image), URL kreacji, typ angle (UGC/demo/...), hook, copy, CTA, data startu, status aktywny, lista krajów, heat_score, `adVariantsCount` (aktywne reklamy marki), `scalingSince` (dni skalowania), `ageInDays`, `newVariantsLast14Days`, `offerType`, `confidence`
- **user**: id, wybrane nisze, plan (free/pro), licznik swipe'ów dziś
- **board**: nazwa, właściciel (user), createdAt
- **saved_item**: powiązanie board → ad/product, data zapisu
- **swipe**: user, adId, kierunek (skip/save/deep), timestamp → zasila personalizację

Tabele infrastrukturalne pipeline'u (nie są encjami UI, ale są częścią schematu):

- **raw_ads** (staging): surowy scrape z Apify/TikTok przed enrichmentem — `ad_archive_id`, `source`, `payload` (jsonb), `scraped_at`, `processed`/`processed_at`. Stąd enrichment zasila tabelę `ads`.
- **scrape_config**: konfiguracja zadań pozyskiwania — `source`, `query`, `country`, `niche`, `is_active`, `max_results`, `last_run_at`.

> **Źródło prawdy schematu = `supabase/migrations/0001_init.sql`** (9 tabel: 7 encji powyżej + `raw_ads`, `scrape_config`). Schemat istnieje od Etapu 1 krok 1. Typy TypeScript w `lib/types.ts` odwzorowują encje domenowe 1:1; mock-dane są z nimi zgodne, by podmiana źródła była bezbolesna (zrealizowana w kroku 2 — `lib/data/source.ts` czyta z Supabase).

**Row-Level Security (RLS) — włączone na wszystkich 9 tabelach:**

- **Treść publiczna** (`brands`, `products`, `ads`): odczyt dla wszystkich (anon + zalogowani); zapis wyłącznie `service_role` (pipeline/seed).
- **Dane użytkownika** (`users`, `boards`, `saved_items`, `swipes`): user widzi i edytuje tylko swoje — polityki na `auth.uid()`.
- **Infrastruktura** (`raw_ads`, `scrape_config`): RLS włączone, zero polityk → dostęp wyłącznie przez `service_role` (omija RLS); klient nie ma dostępu.

**Ważne decyzje:**
- BEZ pól marży i cen źródłowych — marży nie ma w produkcie w ogóle
- `profit` (--profit, mięta) służy do sygnału "skaluje", nie do pieniędzy
- Przy niskim `confidence` UI pokazuje samą markę bez nazwy oferty
- Przycisk linku zewnętrznego nazywa się "strona", nie "sklep"

## 11. Personalizacja

Na start bez ML. Swipe'y to sygnał: po ~50 swipe'ach wiadomo, które nisze user zapisuje, a które pomija — feed waży nisze w górę/dół tagowo. Proste, wystarczające, rozszerzalne później.

### Zasada feedu — trzy poziomy sterowania (ważna logika, nie kosmetyka)

Intencja i nisze sterują feedem na trzech poziomach:

1. **Tryb feedu** — intencja ustawia domyślny tryb (Produkty lub Inspiracje). Tryb zmienia CO eksponujemy na karcie (dla Inspiracji akcentujemy angle/hook/format kreacji zamiast kategorii oferty), nie które reklamy się ładują.

2. **Filtr kategorii oferty** — intencja ustawia domyślny filtr `offerType` (np. `physical` dla dropshippera). To **elastyczny punkt startowy, NIE klatka** — user zmienia filtr jednym tapnięciem w feedzie i wraca do pełnego katalogu kiedy chce.

3. **Ważenie nisz** — wybrane nisze w onboardingu + sygnały swipe (save/skip) podbijają reklamy z preferowanych nisz wyżej w kolejce, ale ich nie wycinają. Mechanizm miękki: **częściej/rzadziej, nie tak/nie**. Inne nisze są zawsze dostępne — scroll wystarczy.

**KRYTYCZNE:** Feed nigdy nie pokazuje 100% jednej kategorii — zawsze jest domieszka różnorodności. Za mocne zawężenie = nuda = utrata retencji (efekt TikTok: nawet jeśli lubisz gotowanie, co 10-20 filmów pojawia się coś innego). Onboarding to inteligentny punkt startowy, nie dożywotni kanał tematyczny.

## 12. Monetyzacja

Freemium:
- **Free:** ~20 swipe'ów/dzień, ograniczone deep dive'y, boardy tak
- **Pro (~29–49 zł/mies):** nielimitowane swipe'y, pełne deep dive'y, alerty skalowania (backlog), eksport (backlog)

Stripe jako bramka. Paywall w Etapie 4.

## 13. Pozyskiwanie danych (od Etapu 1 — nie w mock)

- **Meta Ad Library** przez Apify (aktor `curious_coder/facebook-ads-library-scraper`, ~$0.75/1000; backup: oficjalny `apify/facebook-ads-scraper`). Tylko dane publiczne, bez logowania.
- **TikTok Creative Center** — darmowe, top ady e-commerce.
- **Enrichment** każdej pozycji przez Claude API (Haiku, batch): klasyfikacja kategorii oferty, niszy, angle, hook + policzenie heat score.

**Klasyfikator kategorii:** Claude przypisuje każdej reklamie kategorię oferty: `fizyczny / cyfrowy / aplikacja / usługa / kurs / inne`. Identyfikacja oferty przez landing page — link docelowy → tytuł strony + OG tags. Pola z landinga noszą `confidence` (0–1); przy niskim confidence UI pokazuje samą markę.

**Ścieżka natywna:** start jako PWA → walidacja → Capacitor → App Store + Google Play + natywne push.

### 13.5 Hosting kreacji (decyzja: hosting u siebie na Cloudflare R2)

Feed działa jak TikTok — wideo gra od razu podczas scrollowania, nie po kliknięciu.
Dlatego kreacje hostujemy u siebie, nie linkujemy do wygasających URL-i Mety.

- Storage: Cloudflare R2 (zero opłat egress — kluczowe przy wideo oglądanym masowo; $0.015/GB/mies storage). Nie S3 (egress zabija budżet przy wideo).
- Przy zaciąganiu: wideo z Meta jest transkodowane i kompresowane do ~3-5 MB (9:16, bitrate pod telefon) PRZED zapisem do R2. Nie zapisujemy surowych oryginałów.
- `thumb_url` (poster/pierwsza klatka) też w R2, jako plakat wideo zanim załaduje się strumień.
- Koszt: faza startowa ~$0.12/mies, faza wzrostu (50k wideo) <$5/mies, skala <$10/mies.

## 14. Ryzyka i compliance (świadomie)

- Scraping Ad Library = dane publiczne, ale: polityka prywatności z podstawą "uzasadniony interes", procedura usunięcia na żądanie.
- Kreacje reklamowe — hostujemy **pełne, przetranskodowane wideo u siebie na Cloudflare R2** (jak Minea/WinningHunter), nie linkujemy do wygasających URL-i Mety. Uzasadnienie techniczne: feed gra wideo od razu podczas scrollowania (patrz §13.5). Procedura takedown 48h obowiązkowa. *(Decyzja aktualna — zastępuje wcześniejszą koncepcję "tylko miniatury/embedy".)*
- Konstrukcja prawna: osobna działalność/spółka, nie pod istniejącym e-commerce.
- Zależność od aktora Apify: warstwa pozyskiwania wymienialna (abstrakcja), drugi aktor w zapasie.
- Hosting cudzych kreacji u siebie (jak Minea/WinningHunter): wymaga PRZED launchem procedury takedown (usunięcie na żądanie), osobnej spółki/działalności, polityki prywatności. Świadomie przyjęte ryzyko — standard w branży ad-spy.

## 15. Definicja sukcesu per etap

- **Etap 0 (koncept):** komplet decyzji — ten dokument + CLAUDE.md.
- **Etap 1 (pipeline):** 500 realnych produktów w Supabase z policzonym heat score.
- **Etap 2 (feed):** swipe'ujesz własne dane na telefonie, gesty działają, boardy zapisują.
- **Etap 3 (auth):** logowanie + boardy per user + limit swipe'ów.
- **Etap 4 (monetyzacja):** działający paywall Pro przez Stripe.

> Kolejność budowy odwrócona względem etapów danych: **najpierw feed na mock-danych** (Etap 2 przed Etapem 1), żeby dopracować UX i dopaminę zanim wydamy budżet na dane. Mock musi odwzorowywać realny schemat 1:1, żeby podmiana na Supabase była bezbolesna.
