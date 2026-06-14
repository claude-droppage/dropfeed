# Edge Function `ingest` — Apify → raw_ads (Etap 1, krok 3)

Odbiera webhook Apify po udanym runie scrapera, dociąga dataset z Apify API
i robi upsert do `raw_ads` (dedup po `ad_archive_id`). Model **push**.

## Sekrety (server-side, NIE w repo, NIE NEXT_PUBLIC_)

Funkcja czyta z env:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — wstrzykiwane automatycznie przez Supabase.
- `APIFY_TOKEN` — token Apify (do pobrania datasetu).
- `INGEST_WEBHOOK_SECRET` — współdzielony sekret; ten sam wpisany w nagłówku webhooka Apify.

Ustawienie (po `supabase link`):

```bash
supabase secrets set APIFY_TOKEN=apify_api_xxx
supabase secrets set INGEST_WEBHOOK_SECRET=$(openssl rand -hex 24)
# zapamiętaj wygenerowany sekret — wpiszesz go w webhooku Apify
```

## Deploy

```bash
supabase functions deploy ingest      # verify_jwt=false ustawione w config.toml
```

URL funkcji: `https://<project-ref>.supabase.co/functions/v1/ingest`

## Webhook po stronie Apify

W zadaniu/aktorze (Apify Console → Actor → Integrations → Webhooks) lub w
harmonogramie (krok 6) dodaj webhook:

- **Event:** `Run succeeded` (`ACTOR.RUN.SUCCEEDED`)
- **URL:** `https://<project-ref>.supabase.co/functions/v1/ingest`
- **Headers:** `x-webhook-secret: <INGEST_WEBHOOK_SECRET>`
- Payload: domyślny (zawiera `resource.defaultDatasetId`).

## Wąski pierwszy run (beauty / PL / ~500)

Input aktora `curious_coder/facebook-ads-library-scraper`:

```json
{
  "urls": [
    {"url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=PL&q=gua%20sha&search_type=keyword_unordered&media_type=all"},
    {"url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=PL&q=ice%20roller&search_type=keyword_unordered&media_type=all"},
    {"url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=PL&q=serum%20do%20twarzy&search_type=keyword_unordered&media_type=all"},
    {"url": "https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=PL&q=roller%20do%20twarzy&search_type=keyword_unordered&media_type=all"}
  ],
  "count": 500,
  "limitPerSource": 125,
  "scrapeAdDetails": true
}
```

Odpowiada wierszom w `supabase/seed/scrape_config_narrow.sql`.

## Weryfikacja po runie

```sql
-- ile reklam, ile unikalnych (powinno być równe — dedup działa)
select count(*) as total, count(distinct ad_archive_id) as unikalne from raw_ads;
-- podgląd kilku
select ad_archive_id, source, payload->'snapshot'->>'page_name' as marka,
       payload->'snapshot'->>'link_url' as landing, scraped_at
from raw_ads order by scraped_at desc limit 5;
```

Idempotencja: ponowny run tych samych słów kluczowych nie zwiększa `total`
(upsert po `ad_archive_id`).
