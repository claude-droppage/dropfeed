-- ════════════════════════════════════════════════════════════════════════
-- 0013_tiktok_shop_detail — deep-dive TikTok Shop (Faza 3, T3b)
-- Twarde dane produktu (scrapeType=product) + powiązane wideo (clockworks v0,
-- wyszukane po nazwie — NIE precyzyjne linkowanie). On-demand + cache ~2 tyg
-- (detail_fetched_at / videos_fetched_at).
-- ════════════════════════════════════════════════════════════════════════

alter table public.tiktok_shop_products
  add column if not exists exact_sold_count  bigint,
  add column if not exists sold_last_30       bigint,
  add column if not exists shop_video_count   integer,
  add column if not exists first_live_time    text,
  add column if not exists shop_name          text,
  add column if not exists shop_followers     bigint,
  add column if not exists shop_total_sold    bigint,
  add column if not exists shop_url           text,
  add column if not exists shop_rating        numeric,
  add column if not exists detail_fetched_at  timestamptz,
  add column if not exists videos_fetched_at  timestamptz;

create table if not exists public.tiktok_shop_video (
  product_id text not null references public.tiktok_shop_products (product_id) on delete cascade,
  video_id   text not null,
  url        text,
  cover_url  text,
  caption    text,
  author     text,
  views      bigint,
  likes      bigint,
  comments   bigint,
  shares     bigint,
  created_at timestamptz,
  fetched_at timestamptz not null default now(),
  primary key (product_id, video_id)
);
create index if not exists tts_video_product_idx on public.tiktok_shop_video (product_id, views desc);

alter table public.tiktok_shop_video enable row level security;
drop policy if exists tts_video_select on public.tiktok_shop_video;
create policy tts_video_select on public.tiktok_shop_video for select using (true);
