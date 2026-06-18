-- ════════════════════════════════════════════════════════════════════════
-- 0020_tiktok_category_exclusion — wykluczenie kategorii konsumpcyjnych (Część C).
-- Suplementy / kremy / maści / kosmetyki konsumpcyjne NIE są perełkami ani się
-- nie pojawiają w feedzie/Propozycjach. Dopasowanie po TYTULE (dane US → EN+PL).
-- Lista słów KONFIGUROWALNA — źródło prawdy: scripts/tiktok-snapshot.ts (EXCL_RE)
-- + niżej (backfill) + wpis w CLAUDE.md. Dane zostają (nie usuwamy), tylko flaga;
-- wykluczone są pomijane w dziennym snapshocie (czysty zestaw, mniejszy koszt).
-- ════════════════════════════════════════════════════════════════════════

alter table public.tiktok_shop_products
  add column if not exists excluded boolean not null default false;

-- backfill istniejącego zestawu (ten sam wzorzec co w silniku TS)
update public.tiktok_shop_products
set excluded = lower(coalesce(title, '')) ~* '\m(cream|serum|ointment|balm|lotion|supplement|vitamin|collagen|capsule|capsules|gummies|gummy|skincare|krem|masc|balsam|suplement|witamina|kolagen)\M|face ?mask';

create index if not exists tts_products_excluded_idx on public.tiktok_shop_products (region, excluded, archived);
