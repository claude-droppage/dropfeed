-- ════════════════════════════════════════════════════════════════════════
-- scrape_config — FAZA B: 6 nisz (PL) dla codziennego dopływu nowych reklam.
-- Codzienny GH Action czyta is_active=true i buduje URL-e Ad Library.
-- Idempotentny (po source+query+country). max_results = podpowiedź na słowo;
-- łączny dzienny limit (~200) ustawia GH Action.
-- ════════════════════════════════════════════════════════════════════════

insert into scrape_config (source, query, country, niche, is_active, max_results)
select v.source, v.query, v.country, v.niche::niche_type, true, v.max_results
from (values
  -- beauty
  ('meta_ad_library', 'gua sha',                 'PL', 'beauty',  20),
  ('meta_ad_library', 'serum do twarzy',         'PL', 'beauty',  20),
  ('meta_ad_library', 'krem przeciwzmarszczkowy','PL', 'beauty',  20),
  ('meta_ad_library', 'peeling',                 'PL', 'beauty',  20),
  -- fitness / zdrowie
  ('meta_ad_library', 'korektor postawy',        'PL', 'fitness', 20),
  ('meta_ad_library', 'taśmy oporowe',           'PL', 'fitness', 20),
  ('meta_ad_library', 'masażer',                 'PL', 'health',  20),
  ('meta_ad_library', 'kolagen',                 'PL', 'health',  20),
  -- dom / kuchnia
  ('meta_ad_library', 'projektor gwiazd',        'PL', 'home',    20),
  ('meta_ad_library', 'organizer',               'PL', 'home',    20),
  ('meta_ad_library', 'blender ręczny',          'PL', 'kitchen', 20),
  ('meta_ad_library', 'patelnia granitowa',      'PL', 'kitchen', 20),
  -- pet
  ('meta_ad_library', 'szelki dla psa',          'PL', 'pet',     20),
  ('meta_ad_library', 'lokalizator gps pies',    'PL', 'pet',     20),
  ('meta_ad_library', 'drapak',                  'PL', 'pet',     20),
  -- gadżety / tech
  ('meta_ad_library', 'powerbank',               'PL', 'gadgets', 20),
  ('meta_ad_library', 'lokalizator kluczy',      'PL', 'gadgets', 20),
  ('meta_ad_library', 'kamera wsteczna',         'PL', 'tech',    20),
  -- moda / akcesoria
  ('meta_ad_library', 'portfel slim',            'PL', 'fashion', 20),
  ('meta_ad_library', 'zegarek smart',           'PL', 'fashion', 20),
  ('meta_ad_library', 'okulary fotochromowe',    'PL', 'fashion', 20)
) as v(source, query, country, niche, max_results)
where not exists (
  select 1 from scrape_config sc
  where sc.source = v.source and sc.query = v.query and sc.country = v.country
);
