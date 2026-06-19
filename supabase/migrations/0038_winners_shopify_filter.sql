-- ════════════════════════════════════════════════════════════════════════
-- 0038_winners_shopify_filter — winnerzy tylko Shopify (gate retro na display) + bonus product-page.
-- floored wyklucza confirmed non_shopify (unknown/null zostaje — bezpiecznik). Strona produktowa
-- (landing_type=product) = bonus do score + badge (has_product_page). TikTok bez zmian.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.product_winners(
  p_limit int default 10, p_country text default null, p_tiered boolean default true, p_dedup_window boolean default false
)
returns jsonb language sql stable set search_path = public as $$
  with active as (
    select id, product_id, brand_id, heat_score, thumb_url, creative_url, country, format, age_in_days, created_at, platform, landing_type
    from ads where is_active and product_id is not null and (p_country is null or country = p_country)
  ),
  brand_real as (select brand_id, fb_total from brand_active_total where fetched_at > now() - interval '14 days'),
  brand_snap as (select distinct on (brand_id) brand_id, active_ads_count as snap_ads from brand_daily_snapshot order by brand_id, day desc),
  stored_ads as (select brand_id, count(*)::int as c from ads where is_active group by brand_id),
  stores as (select offer_url, count(distinct brand_id) as stores_count from products where offer_url is not null and offer_url <> '' group by offer_url),
  mom as (
    select brand_id, ((array_agg(active_ads_count order by day desc))[1] - (array_agg(active_ads_count order by day asc))[1])::int as momentum_delta
    from brand_daily_snapshot where day >= current_date - 21 group by brand_id
  ),
  -- produkty/marki już pokazane w oknie ostatnich 6 dni (do wykluczenia)
  win6_prod as (select distinct product_id from products_daily_winners where day between current_date - 6 and current_date - 1),
  win6_brand as (
    select distinct pr.brand_id from products_daily_winners w join products pr on pr.id = w.product_id
    where w.day between current_date - 6 and current_date - 1
  ),
  agg as (
    select p.id, p.brand_id, p.name, p.niche, p.price_in_store, p.offer_url,
           b.name as brand_name, b.store_url, b.logo_url, b.avatar_initials, b.fb_page_id,
           count(*)::int as ad_count, max(act.heat_score)::int as heat,
           min(act.age_in_days)::int as newest_age, max(act.age_in_days)::int as oldest_age,
           (current_date - min(act.created_at)::date)::int as first_seen_days,
           count(*) filter (where act.created_at >= now() - interval '7 days')::int as new_ads_7d,
           mode() within group (order by act.country) as country,
           bool_or(act.country is not null and act.country <> 'PL') as has_foreign,
           (array_agg(act.creative_url order by act.heat_score desc) filter (where act.format = 'video'))[1] as rep_video,
           (array_agg(coalesce(act.thumb_url, act.creative_url) order by act.heat_score desc))[1] as rep_thumb,
           coalesce(s.stores_count, 1)::int as stores_count,
           coalesce(m.momentum_delta, 0) as momentum_delta,
           coalesce(br.fb_total, bs.snap_ads, sa.c, count(*))::int as active_brand_ads,
           mode() within group (order by act.platform) as platform,
           bool_or(act.landing_type = 'product') as has_product_page
    from products p
    join brands b on b.id = p.brand_id
    join active act on act.product_id = p.id
    left join stores s on s.offer_url = p.offer_url
    left join mom m on m.brand_id = p.brand_id
    left join brand_real br on br.brand_id = p.brand_id
    left join brand_snap bs on bs.brand_id = p.brand_id
    left join stored_ads sa on sa.brand_id = p.brand_id
    where not public.is_excluded_title(p.name) and not public.is_nonproduct(p.name, p.offer_url)
      and not public.is_blocked_brand(b.name) and not public.is_beauty_category(p.category)
      and (not p_dedup_window or (p.id not in (select product_id from win6_prod) and p.brand_id not in (select brand_id from win6_brand)))
    group by p.id, p.brand_id, p.name, p.niche, p.price_in_store, p.offer_url, b.name, b.store_url, b.logo_url,
             b.avatar_initials, b.fb_page_id, s.stores_count, m.momentum_delta, br.fb_total, bs.snap_ads, sa.c
  ),
  floored as (select * from agg where oldest_age >= 7 and coalesce(platform,'unknown') <> 'non_shopify'),
  classified as (
    select *,
      (active_brand_ads >= 30 and (new_ads_7d > 0 or momentum_delta >= 0) and (ad_count >= 2 or stores_count >= 2)) as is_proven_b,
      (oldest_age <= 21 and (momentum_delta > 0 or new_ads_7d > 0) and active_brand_ads < 30) as is_fresh_b,
      (active_brand_ads + new_ads_7d * 4 + greatest(0, momentum_delta) * 3 + least(stores_count, 10) * 4 + oldest_age * 0.3 + (case when has_product_page then 8 else 0 end)) as score
    from floored
  ),
  dedup_offer as (select distinct on (coalesce(offer_url, id::text)) * from classified order by coalesce(offer_url, id::text), score desc),
  -- jeden-na-markę (przy p_dedup_window); inaczej zostaw wszystkie
  dedup_brand as (
    select * from (
      select *, case when p_dedup_window then row_number() over (partition by brand_id order by score desc) else 1 end as brn
      from dedup_offer
    ) t where brn = 1
  ),
  e as (
    select d.*, jsonb_build_object(
      'product_id', id, 'name', name, 'brand_name', brand_name, 'logo_url', logo_url, 'avatar_initials', avatar_initials, 'page_id', fb_page_id,
      'niche', niche, 'price', price_in_store, 'offer_url', offer_url, 'store_url', store_url, 'ad_count', ad_count,
      'oldest_age', oldest_age, 'newest_age', newest_age, 'first_seen_days', first_seen_days, 'new_ads_7d', new_ads_7d,
      'country', country, 'has_foreign', has_foreign, 'stores_count', stores_count, 'momentum_delta', momentum_delta,
      'heat', heat, 'active_brand_ads', active_brand_ads, 'platform', platform, 'has_product_page', has_product_page, 'rep_video', rep_video, 'rep_thumb', rep_thumb,
      'is_video', (rep_video is not null), 'is_fresh', is_fresh_b, 'is_validated', (stores_count >= 3),
      'is_scaling', (momentum_delta > 0 or new_ads_7d > 0),
      'tier', (case when is_proven_b then 'proven' when is_fresh_b then 'fresh' else 'other' end), 'score', round(score, 1)
    ) as j
    from dedup_brand d
  ),
  ranked as (
    select *,
      row_number() over (partition by is_proven_b order by active_brand_ads desc, oldest_age desc) as proven_rank,
      row_number() over (partition by is_fresh_b order by new_ads_7d desc, momentum_delta desc, first_seen_days asc) as fresh_rank,
      row_number() over (order by score desc) as score_rank
    from e
  )
  select coalesce(jsonb_agg(j order by blk, ord), '[]'::jsonb)
  from (
    select j, 1 as blk, proven_rank as ord from ranked where p_tiered and is_proven_b and proven_rank <= (p_limit * 7 / 10)
    union all
    select j, 2 as blk, fresh_rank as ord from ranked where p_tiered and is_fresh_b and fresh_rank <= (p_limit - p_limit * 7 / 10)
    union all
    select j, 0 as blk, score_rank as ord from ranked where (not p_tiered) and score_rank <= p_limit
  ) z;
$$;
grant execute on function public.product_winners(int, text, boolean, boolean) to anon, authenticated, service_role;
