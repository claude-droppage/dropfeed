-- ════════════════════════════════════════════════════════════════════════
-- 0011_discover_card_fields — pola pod galerię kart /products (Minea-style)
-- Dodaje do discover_products: oldest_age (dni aktywności = staż najstarszej
-- aktywnej reklamy) + country (dominujący rynek reklam → flaga na karcie).
-- Tylko twarde dane (brak wyświetleń/spendu — FB Ad Library tego nie daje).
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.discover_products(p_limit int default 40)
returns jsonb language sql stable set search_path = public as $$
  with active as (
    select product_id, heat_score, thumb_url, creative_url, country, format, age_in_days
    from ads where is_active and product_id is not null
  ),
  stores as (
    select offer_url, count(distinct brand_id) as stores_count
    from products where offer_url is not null and offer_url <> ''
    group by offer_url
  ),
  mom as (
    select brand_id,
           (max(day) - min(day))::int as momentum_days,
           ((array_agg(active_ads_count order by day desc))[1]
              - (array_agg(active_ads_count order by day asc))[1])::int as momentum_delta
    from brand_daily_snapshot
    where day >= current_date - 21
    group by brand_id
  ),
  agg as (
    select p.id, p.name, p.niche, p.price_in_store, p.offer_url,
           b.name as brand_name, b.store_url,
           count(*)::int as ad_count,
           max(act.heat_score)::int as heat,
           min(act.age_in_days)::int as newest_age,
           max(act.age_in_days)::int as oldest_age,
           mode() within group (order by act.country) as country,
           bool_or(act.country is not null and act.country <> 'PL') as has_foreign,
           (array_agg(coalesce(act.thumb_url, act.creative_url) order by act.heat_score desc))[1] as rep_thumb,
           coalesce(s.stores_count, 1)::int as stores_count,
           coalesce(m.momentum_days, 0) as momentum_days,
           coalesce(m.momentum_delta, 0) as momentum_delta
    from products p
    join brands b on b.id = p.brand_id
    join active act on act.product_id = p.id
    left join stores s on s.offer_url = p.offer_url
    left join mom m on m.brand_id = p.brand_id
    group by p.id, p.name, p.niche, p.price_in_store, p.offer_url, b.name, b.store_url,
             s.stores_count, m.momentum_days, m.momentum_delta
  )
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
  from (select * from agg order by heat desc nulls last limit p_limit) x;
$$;
