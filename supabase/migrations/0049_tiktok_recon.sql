-- ════════════════════════════════════════════════════════════════════════
-- 0049_tiktok_recon — artefakt reconu TikTok ads (podgląd na /tiktok-recon, read-only).
-- Reklamy z EU Ad Library (data_xplorer) + pHash kreacji + wynik dopasowania mostkami:
--   A pHash↔FB (matched_product_id), B bio link (bio_link/bio_shopify), C marka (brand_match).
-- ════════════════════════════════════════════════════════════════════════
create table if not exists public.tiktok_ad_recon (
  ad_id        text primary key,
  advertiser   text,
  regions      text[],
  reach        text,
  cta          text,
  first_shown  date,
  last_shown   date,
  media_url    text,
  phash        text,
  -- Mostek A: pHash ↔ FB
  matched_product_id uuid,
  matched_name text,
  matched_offer_url text,
  matched_platform text,
  hamming      int,
  -- Mostek B: profil → bio
  bio_link     text,
  bio_shopify  text,
  -- Mostek C: marka
  brand_match  text,
  created_at   timestamptz not null default now()
);
alter table public.tiktok_ad_recon enable row level security;
drop policy if exists tar_select on public.tiktok_ad_recon;
create policy tar_select on public.tiktok_ad_recon for select using (true);
