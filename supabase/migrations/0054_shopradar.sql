-- ════════════════════════════════════════════════════════════════════════
-- 0054_shopradar — silnik researchu TikTok Shop (ShopRadar) w SwipeSpy.
-- Źródło danych: Scrape Creators API. Rynki LIVE (US default + DE/ES/FR/IT/GB/IE…).
-- PL niedostępne (TikTok Shop nie wystartował w PL). Tu DOZWOLONY modelowany
-- est_revenue (świadoma decyzja właściciela — wyjątek od reguły „nigdy $").
-- Tabele treści: RLS select=true, zapis service_role. user-scoped: brands/briefs/saved.
-- ════════════════════════════════════════════════════════════════════════

-- Produkty TikTok Shop (z search). dedup po (product_id, region).
create table if not exists public.shop_products (
  product_id    text not null,
  region        text not null default 'US',
  title         text,
  description   text,
  image_url     text,
  video_url     text,
  price         numeric,
  currency      text default '$',
  rating        numeric,
  review_count  int,
  sold_count    bigint,
  est_revenue   numeric,
  seller_id     text,
  shop_name     text,
  shop_logo     text,
  category      text,
  product_url   text,
  videos_cache  jsonb,          -- powiązane wideo (faza 3)
  reviews_cache jsonb,          -- analiza recenzji (faza 4)
  teardown      jsonb,          -- AI teardown najlepszego wideo (faza 3)
  first_seen    timestamptz not null default now(),
  last_seen     timestamptz not null default now(),
  primary key (product_id, region)
);
create index if not exists shop_products_rev_idx on public.shop_products (region, est_revenue desc);
create index if not exists shop_products_sold_idx on public.shop_products (region, sold_count desc);
alter table public.shop_products enable row level security;
drop policy if exists shop_products_sel on public.shop_products;
create policy shop_products_sel on public.shop_products for select using (true);

-- Snapshoty sprzedaży (Movers / velocity).
create table if not exists public.shop_snapshots (
  product_id  text not null,
  region      text not null default 'US',
  captured_at timestamptz not null default now(),
  sold_count  bigint,
  price       numeric,
  primary key (product_id, region, captured_at)
);
create index if not exists shop_snap_idx on public.shop_snapshots (product_id, region, captured_at);
alter table public.shop_snapshots enable row level security;
drop policy if exists shop_snap_sel on public.shop_snapshots;
create policy shop_snap_sel on public.shop_snapshots for select using (true);

-- Profile twórców (faza 3).
create table if not exists public.shop_creators (
  handle       text primary key,
  nickname     text,
  followers    bigint,
  likes        bigint,
  video_count  int,
  email        text,
  us_pct       numeric,
  avatar       text,
  raw          jsonb,
  fetched_at   timestamptz not null default now()
);
alter table public.shop_creators enable row level security;
drop policy if exists shop_creators_sel on public.shop_creators;
create policy shop_creators_sel on public.shop_creators for select using (true);

-- Marki użytkownika (Brand Bible) — user-scoped.
create table if not exists public.shop_brands (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  name           text not null,
  bible          text,
  brief_template text,
  products       jsonb not null default '[]'::jsonb,
  created_at     timestamptz not null default now()
);
alter table public.shop_brands enable row level security;
drop policy if exists shop_brands_own on public.shop_brands;
create policy shop_brands_own on public.shop_brands for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Briefy kreatywne — user-scoped.
create table if not exists public.shop_briefs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  brand_id     uuid references public.shop_brands (id) on delete set null,
  title        text,
  competitor_product_id text,
  content      text,
  created_at   timestamptz not null default now()
);
alter table public.shop_briefs enable row level security;
drop policy if exists shop_briefs_own on public.shop_briefs;
create policy shop_briefs_own on public.shop_briefs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Zapisane (produkty/wideo) — user-scoped.
create table if not exists public.shop_saved (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null,        -- 'product' | 'video'
  ref_id     text not null,        -- product_id lub video url
  region     text,
  meta       jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, kind, ref_id)
);
alter table public.shop_saved enable row level security;
drop policy if exists shop_saved_own on public.shop_saved;
create policy shop_saved_own on public.shop_saved for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
