-- ════════════════════════════════════════════════════════════════════════
-- 0025_products_daily_winners — historia zwycięzców FB pod kalendarz 7 dni (Część 2).
-- Codziennie (PO scrape FB, BEZ dodatkowego scrape'a) zapisujemy top-10 z product_winners.
-- signals = pełny wiersz zwycięzcy jako-of-dnia → kalendarz renderuje uczciwie historycznie.
-- Dzień 1: tylko dziś ma dane; dni bez snapshotu = uczciwy pusty stan w UI.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.products_daily_winners (
  day        date  not null default current_date,
  product_id uuid  not null references public.products (id) on delete cascade,
  rank       int   not null,
  score      numeric,
  signals    jsonb,
  primary key (day, product_id)
);
create index if not exists pdw_day_rank_idx on public.products_daily_winners (day, rank);

alter table public.products_daily_winners enable row level security;
drop policy if exists pdw_select on public.products_daily_winners;
create policy pdw_select on public.products_daily_winners for select using (true);

-- Liczy top-10 zwycięzców i zapisuje wiersze dnia (idempotentne — ponowny run nadpisuje).
-- SECURITY DEFINER: wołane z pipeline'u (service_role) po scrape; zapis omija RLS.
create or replace function public.snapshot_product_winners(p_limit int default 10)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from products_daily_winners where day = current_date;
  insert into products_daily_winners (day, product_id, rank, score, signals)
  select current_date, (w->>'product_id')::uuid, ord::int, (w->>'score')::numeric, w
  from jsonb_array_elements(public.product_winners(p_limit)) with ordinality as t(w, ord);
  get diagnostics n = row_count;
  return n;
end;
$$;
grant execute on function public.snapshot_product_winners(int) to service_role;

-- Odczyt zwycięzców dla dnia (kalendarz). Pusto, gdy brak snapshotu.
create or replace function public.product_winners_for_date(p_date date)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(signals order by rank), '[]'::jsonb)
  from products_daily_winners where day = p_date;
$$;
grant execute on function public.product_winners_for_date(date) to anon, authenticated, service_role;

-- Lista dni z dostępnym snapshotem (ostatnie 7) — do selektora.
create or replace function public.winner_days(p_n int default 7)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(day order by day desc), '[]'::jsonb)
  from (select distinct day from products_daily_winners order by day desc limit p_n) d;
$$;
grant execute on function public.winner_days(int) to anon, authenticated, service_role;
