-- ════════════════════════════════════════════════════════════════════════
-- 0016_tiktok_shop_daily_engine — silnik Propozycji (rdzeń produktu).
-- Dzienny best_sellers scrape per kategoria = discovery + snapshot + rank.
--  • snapshot: dodaj rank (searchRank) + category — rank-delta to PRIMARY sygnał
--    ruchu (odporny na zaokrąglenie; salesVolume = lifetime, % od totalu = szum).
--  • products: tracking_started_at (badge „świeży"), last_seen_at, archived
--    (niewidziany >14 dni → wypada z dziennego scrape, zostaje z historią).
-- ════════════════════════════════════════════════════════════════════════

alter table public.tiktok_shop_snapshot
  add column if not exists rank     integer,
  add column if not exists category text;

alter table public.tiktok_shop_products
  add column if not exists tracking_started_at date    not null default current_date,
  add column if not exists last_seen_at         timestamptz,
  add column if not exists archived             boolean not null default false;

-- backfill: istniejące produkty traktujemy jako widziane dziś (start historii)
update public.tiktok_shop_products set last_seen_at = now() where last_seen_at is null;

create index if not exists tts_products_active_idx on public.tiktok_shop_products (region, archived, last_seen_at);
create index if not exists tts_snapshot_day_idx on public.tiktok_shop_snapshot (day);
