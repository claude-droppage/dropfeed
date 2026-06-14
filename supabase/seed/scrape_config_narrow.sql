-- ════════════════════════════════════════════════════════════════════════
-- scrape_config — wąski pierwszy run (Etap 1, krok 3)
-- Nisza: beauty · Kraj: PL · ~500 reklam łącznie (4 słowa kluczowe × 125)
-- Rejestr intencji scrapingu. Faktyczny input aktora (URL-e Ad Library)
-- ustawiany po stronie Apify — patrz supabase/functions/ingest/README.md.
-- Idempotentny: wstawia tylko brakujące wiersze (po source+query+country).
-- Wklej w Supabase → SQL Editor → Run.
-- ════════════════════════════════════════════════════════════════════════

insert into scrape_config (source, query, country, niche, is_active, max_results)
select v.source, v.query, v.country, v.niche::niche_type, true, v.max_results
from (values
  ('meta_ad_library', 'gua sha',          'PL', 'beauty', 125),
  ('meta_ad_library', 'ice roller',       'PL', 'beauty', 125),
  ('meta_ad_library', 'serum do twarzy',  'PL', 'beauty', 125),
  ('meta_ad_library', 'roller do twarzy', 'PL', 'beauty', 125)
) as v(source, query, country, niche, max_results)
where not exists (
  select 1 from scrape_config sc
  where sc.source = v.source and sc.query = v.query and sc.country = v.country
);
