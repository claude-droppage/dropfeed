-- ════════════════════════════════════════════════════════════════════════
-- 0012_tiktok_shop — TikTok Shop (Faza 3, T1). Realne dane z aktora Apify
-- pro100chok/tiktok-shop-scraper-usage (sortBy=best_sellers, region=us).
-- Tylko twarde dane: sprzedane sztuki (sales_volume), cena, rating, ranking.
-- Snapshot dzienny pod TREND (delta sprzedaży w czasie — jak brand_daily_snapshot).
-- ════════════════════════════════════════════════════════════════════════

create table if not exists tiktok_shop_products (
  product_id      text primary key,
  region          text not null default 'us',
  title           text,
  image_url       text,
  product_url     text,
  current_price   numeric,
  original_price  numeric,
  discount_percent text,
  sales_volume    bigint,
  rating          numeric,
  review_count    integer,
  seller_name     text,
  rank            integer,          -- pozycja w best_sellers (z searchRank)
  query           text,             -- zapytanie/kategoria pochodzenia
  updated_at      timestamptz not null default now()
);
create index if not exists tts_products_region_rank_idx on tiktok_shop_products (region, rank);

create table if not exists tiktok_shop_snapshot (
  product_id   text not null references tiktok_shop_products (product_id) on delete cascade,
  day          date not null default current_date,
  sales_volume bigint,
  primary key (product_id, day)
);

-- Treść publiczna: odczyt dla wszystkich; zapis tylko service_role/pipeline (omija RLS).
alter table tiktok_shop_products enable row level security;
alter table tiktok_shop_snapshot enable row level security;
drop policy if exists tts_products_select on tiktok_shop_products;
create policy tts_products_select on tiktok_shop_products for select using (true);
drop policy if exists tts_snapshot_select on tiktok_shop_snapshot;
create policy tts_snapshot_select on tiktok_shop_snapshot for select using (true);
