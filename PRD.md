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
Splash → Logowanie (1 klik Google) → Onboarding (wybierz nisze: beauty, kuchnia, pet, fitness, gadżety, dom...) → od razu spersonalizowany feed. Cel: "aha" w pierwszych 10 sekundach.

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

> Pełen schemat SQL powstaje w Etapie 1 (pipeline). W Etapie 2 używamy typów TypeScript, które 1:1 odwzorowują te encje, oraz pliku mock-danych zgodnego z tymi typami.

**Ważne decyzje:**
- BEZ pól marży i cen źródłowych — marży nie ma w produkcie w ogóle
- `profit` (--profit, mięta) służy do sygnału "skaluje", nie do pieniędzy
- Przy niskim `confidence` UI pokazuje samą markę bez nazwy oferty
- Przycisk linku zewnętrznego nazywa się "strona", nie "sklep"

## 11. Personalizacja

Na start bez ML. Swipe'y to sygnał: po ~50 swipe'ach wiadomo, które nisze user zapisuje, a które pomija — feed waży nisze w górę/dół tagowo. Proste, wystarczające, rozszerzalne później.

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

## 14. Ryzyka i compliance (świadomie)

- Scraping Ad Library = dane publiczne, ale: polityka prywatności z podstawą "uzasadniony interes", procedura usunięcia na żądanie.
- Kreacje reklamowe — trzymać miniatury/embedy, nie pełne kopie; procedura takedown 48h.
- Konstrukcja prawna: osobna działalność/spółka, nie pod istniejącym e-commerce.
- Zależność od aktora Apify: warstwa pozyskiwania wymienialna (abstrakcja), drugi aktor w zapasie.

## 15. Definicja sukcesu per etap

- **Etap 0 (koncept):** komplet decyzji — ten dokument + CLAUDE.md.
- **Etap 1 (pipeline):** 500 realnych produktów w Supabase z policzonym heat score.
- **Etap 2 (feed):** swipe'ujesz własne dane na telefonie, gesty działają, boardy zapisują.
- **Etap 3 (auth):** logowanie + boardy per user + limit swipe'ów.
- **Etap 4 (monetyzacja):** działający paywall Pro przez Stripe.

> Kolejność budowy odwrócona względem etapów danych: **najpierw feed na mock-danych** (Etap 2 przed Etapem 1), żeby dopracować UX i dopaminę zanim wydamy budżet na dane. Mock musi odwzorowywać realny schemat 1:1, żeby podmiana na Supabase była bezbolesna.
