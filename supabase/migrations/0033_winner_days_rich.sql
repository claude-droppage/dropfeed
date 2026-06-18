-- ════════════════════════════════════════════════════════════════════════
-- 0033_winner_days_rich — kalendarz Minea: dzień + miniatura top-zwycięzcy (Część 1).
-- Zwraca [{day, thumb}] (thumb = rep_thumb winnera rank=1 danego dnia) dla selektora.
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.winner_days_rich(p_n int default 7)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('day', day, 'thumb', thumb) order by day desc), '[]'::jsonb)
  from (
    select day, (array_agg(signals->>'rep_thumb' order by rank))[1] as thumb
    from products_daily_winners group by day order by day desc limit p_n
  ) d;
$$;
grant execute on function public.winner_days_rich(int) to anon, authenticated, service_role;
