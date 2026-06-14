-- ════════════════════════════════════════════════════════════════════════
-- 0005 — Część 2: nowe nisze + geografia (market) + język
-- Idempotentna. ALTER TYPE ADD VALUE IF NOT EXISTS (PG12+, transakcyjne).
-- ════════════════════════════════════════════════════════════════════════

alter type niche_type add value if not exists 'baby';
alter type niche_type add value if not exists 'auto';
alter type niche_type add value if not exists 'garden';
alter type niche_type add value if not exists 'office';

-- market (kraj wyszukiwania — FB nie ujawnia kraju reklamy komercyjnej):
alter table raw_ads add column if not exists country text;  -- tagowane przez ingest per-run
alter table ads     add column if not exists country  text;  -- kopiowane z raw_ads w enrich
-- język reklamy (z Haiku) — pod przyszły filtr:
alter table ads     add column if not exists language text;

-- rotacja nisz×rynków między dniami (0/1 = parzysty/nieparzysty dzień):
alter table scrape_config add column if not exists rotation_group smallint not null default 0;
