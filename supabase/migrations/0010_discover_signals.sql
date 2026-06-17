-- ════════════════════════════════════════════════════════════════════════
-- 0010_discover_signals — sygnały odkrywania (Faza 1, F1b)
-- Rozszerza discover_products o SUROWE pola sygnałów (etykiety PL buduje TS):
--   momentum_delta / momentum_days — ze brand_daily_snapshot (przyrost reklam
--     marki w czasie; wymaga ≥2 dni snapshotów — teraz pusto, rośnie z reconcile)
--   newest_age — staż najnowszej aktywnej reklamy (świeżość)
--   has_foreign — produkt reklamowany też poza PL (cross-market)
--   stores_count — z F1a (różne marki na exact offer_url)
-- Lekko na start: BEZ image-embedding i cross-source (CLAUDE.md → później).
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
