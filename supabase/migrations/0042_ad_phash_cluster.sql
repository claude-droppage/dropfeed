-- ════════════════════════════════════════════════════════════════════════
-- 0042_ad_phash_cluster — perceptual hash + klaster kreacji (Perełki v1, COMPUTE).
-- phash = dHash 64-bit (hex) z miniatury/postera R2; cluster_id = kanoniczny „koncept
-- produktu" (near-duplikaty po dystansie Hamminga). Tylko liczone/podgląd — NIE publikowane.
-- ════════════════════════════════════════════════════════════════════════
alter table public.ads
  add column if not exists phash      text,
  add column if not exists cluster_id integer;
create index if not exists ads_cluster_idx on public.ads (cluster_id);
