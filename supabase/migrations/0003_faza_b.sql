-- ════════════════════════════════════════════════════════════════════════
-- 0003 — FAZA B: żywotność reklam + snapshoty osi skalowania
-- Idempotentna. Aplikowana przez Management API (lub SQL Editor).
-- ════════════════════════════════════════════════════════════════════════

-- ─── Żywotność reklam ────────────────────────────────────────────────────
alter table ads add column if not exists last_seen_at   timestamptz;  -- ostatni re-scrape, w którym była aktywna
alter table ads add column if not exists deactivated_at timestamptz;  -- kiedy zniknęła (is_active=false)

-- backfill: istniejące aktywne reklamy potwierdzone w FAZIE A → widziane teraz
update ads set last_seen_at = coalesce(updated_at, created_at)
where last_seen_at is null;

-- ─── Snapshot dzienny liczby aktywnych reklam marki (oś skalowania) ───────
create table if not exists brand_daily_snapshot (
  brand_id         uuid not null references brands (id) on delete cascade,
  day              date not null,
  active_ads_count integer not null,
  created_at       timestamptz not null default now(),
  primary key (brand_id, day)
);
create index if not exists brand_daily_snapshot_brand_idx
  on brand_daily_snapshot (brand_id, day);

-- RLS: odczyt publiczny (deep dive czyta oś przez anon), zapis tylko service_role.
alter table brand_daily_snapshot enable row level security;
drop policy if exists brand_daily_snapshot_read on brand_daily_snapshot;
create policy brand_daily_snapshot_read on brand_daily_snapshot for select using (true);
