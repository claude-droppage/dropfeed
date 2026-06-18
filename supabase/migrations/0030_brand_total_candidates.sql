-- ════════════════════════════════════════════════════════════════════════
-- 0030_brand_total_candidates — kandydaci do odczytu nagłówka „X active ads".
-- Marki z fb_page_id, mające aktywną reklamę ≥7 dni (winner-relevant), których
-- total nie był odświeżany w ost. 7 dni. Sort po liczbie naszych aktywnych reklam
-- (priorytet prawdopodobnym „proven"). Cap p_limit (bounded koszt).
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.brand_total_candidates(p_limit int default 40)
returns jsonb language sql stable set search_path = public as $$
  with snap as (select distinct on (brand_id) brand_id, active_ads_count from brand_daily_snapshot order by brand_id, day desc)
  select coalesce(jsonb_agg(jsonb_build_object('brand_id', id, 'page_id', fb_page_id) order by prio desc), '[]'::jsonb)
  from (
    select b.id, b.fb_page_id, greatest(coalesce(max(sn.active_ads_count),0), count(a.id))::int as prio
    from brands b
    join products p on p.brand_id = b.id
    join ads a on a.product_id = p.id and a.is_active and (current_date - a.start_date) >= 7
    left join brand_active_total bt on bt.brand_id = b.id and bt.fetched_at > now() - interval '7 days'
    left join snap sn on sn.brand_id = b.id
    where b.fb_page_id is not null and bt.brand_id is null and not public.is_excluded_title(p.name)
    group by b.id, b.fb_page_id
    order by prio desc
    limit p_limit
  ) x;
$$;
grant execute on function public.brand_total_candidates(int) to service_role;
