-- ════════════════════════════════════════════════════════════════════════
-- Weryfikacja schematu — wklej w SQL Editor PO uruchomieniu 0001_init.sql
-- ════════════════════════════════════════════════════════════════════════

-- 1) Czy istnieje wszystkie 9 tabel? (oczekiwane: 9 wierszy)
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('raw_ads','brands','products','ads',
                     'users','boards','saved_items','swipes','scrape_config')
order by table_name;

-- 2) Czy RLS jest włączone na każdej tabeli? (rls_enabled = true dla wszystkich)
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relname in ('raw_ads','brands','products','ads',
                  'users','boards','saved_items','swipes','scrape_config')
order by relname;

-- 3) Kluczowe indeksy/unikaty (oczekiwane: ad_archive_id unique, heat_score, niche, offer_type)
select indexname, tablename
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'raw_ads_ad_archive_id_key',
    'ads_ad_archive_id_key',
    'ads_heat_score_idx',
    'products_niche_idx',
    'products_offer_type_idx',
    'ads_offer_type_idx'
  )
order by tablename, indexname;

-- 4) Klucze obce (oczekiwane: products→brands, ads→brands, ads→products,
--    boards→users, saved_items→boards/ads/products, swipes→users/ads, users→auth.users)
select tc.table_name, kcu.column_name, ccu.table_name as references_table
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
join information_schema.constraint_column_usage ccu
  on tc.constraint_name = ccu.constraint_name
where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
order by tc.table_name, kcu.column_name;
