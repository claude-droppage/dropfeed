-- ════════════════════════════════════════════════════════════════════════
-- 0037_ads_platform — tag platformy landingu reklamy (Shopify gate).
-- platform: shopify / non_shopify / unknown ; landing_type: product/collection/home/other.
-- Gate przy ingescie (enrich): confirmed non_shopify NIE wpada; unknown wpada + flaga.
-- Strona produktowa NIE wymagana (advertorial/pre-lander norma) — product = badge + bonus.
-- ════════════════════════════════════════════════════════════════════════
alter table public.ads
  add column if not exists platform     text,
  add column if not exists landing_type text;
create index if not exists ads_platform_idx on public.ads (platform);
