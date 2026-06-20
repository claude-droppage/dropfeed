-- ════════════════════════════════════════════════════════════════════════
-- 0052_tiktok_organic_sellers — IZOLOWANY pipeline odkrywania organicznych
-- sprzedawców TikTok (bio → realny sklep Shopify). NIE dotyka FB scrape ani
-- istniejących powierzchni. Output = pula zweryfikowanych sprzedawców.
-- ════════════════════════════════════════════════════════════════════════

-- Zweryfikowani sprzedawcy. store_domain UNIQUE = jeden sklep = jeden rekord
-- (nawet jeśli ma kilka handle'i). handle też unique (typowo 1:1 ze sklepem).
create table if not exists public.tiktok_organic_sellers (
  id                    uuid primary key default gen_random_uuid(),
  handle                text not null,
  store_url             text,
  store_domain          text not null,
  best_video_url        text,
  best_video_cover_r2   text,
  best_video_playcount  bigint,
  best_video_posted_at  timestamptz,
  first_seen            timestamptz not null default now(),
  last_seen             timestamptz not null default now(),
  cross_source          boolean not null default false,
  source_seed           text,
  unique (store_domain),
  unique (handle)
);
create index if not exists tos_playcount_idx on public.tiktok_organic_sellers (best_video_playcount desc);

alter table public.tiktok_organic_sellers enable row level security;
drop policy if exists tos_select on public.tiktok_organic_sellers;
create policy tos_select on public.tiktok_organic_sellers for select using (true);

-- Log runów (pomiar yieldu/kosztu).
create table if not exists public.tiktok_organic_runs (
  id           uuid primary key default gen_random_uuid(),
  run_at       timestamptz not null default now(),
  seeds        text[],
  videos       int,
  profiles     int,
  verified     int,
  new_sellers  int
);
alter table public.tiktok_organic_runs enable row level security;
drop policy if exists tor_select on public.tiktok_organic_runs;
create policy tor_select on public.tiktok_organic_runs for select using (true);

-- Seedy (produktowe nisze, NIE viral, NIE guru). Rotacja przez last_used_at.
create table if not exists public.tiktok_organic_seeds (
  seed         text primary key,
  niche        text,
  is_active    boolean not null default true,
  last_used_at timestamptz
);
alter table public.tiktok_organic_seeds enable row level security;
drop policy if exists tos_seed_select on public.tiktok_organic_seeds;
create policy tos_seed_select on public.tiktok_organic_seeds for select using (true);

insert into public.tiktok_organic_seeds (seed, niche) values
  ('kitchengadgets', 'kitchen'),
  ('homegadgets', 'home'),
  ('petgadgets', 'pet'),
  ('cardetailing', 'auto'),
  ('phoneaccessories', 'tech'),
  ('ledlights', 'home'),
  ('gardengadgets', 'garden'),
  ('fitnessgear', 'fitness'),
  ('kitchentools', 'kitchen'),
  ('desksetup', 'tech')
on conflict (seed) do nothing;
