-- 0014 — twórcy wideo (P1): avatar + obserwujący z authorMeta ($0 extra).
alter table public.tiktok_shop_video
  add column if not exists author_avatar    text,
  add column if not exists author_followers bigint;
