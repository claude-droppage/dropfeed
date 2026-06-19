-- ════════════════════════════════════════════════════════════════════════
-- 0044_cluster_gems_full_seller_count — n_sellers/nasycenie liczone z CAŁEGO klastra
-- (wszystkie aktywne ads cluster_id), nie z reprezentanta/eligible-subset (zaniżało
-- walidację i karę nasycenia). Klaster pokazywany tylko gdy ma eligible+renderowalny rep.
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.fb_cluster_gems(p_limit int default 20, p_aggro numeric default 0.6)
returns jsonb language sql stable set search_path = public as $$
  with tt as (select distinct public.norm_brand(seller_name) as sn from tiktok_shop_products where not archived and seller_name is not null),
  cl as ( -- CAŁY klaster (wszystkie aktywne ads), z flagami eligible/renderowalne
    select a.cluster_id, a.brand_id, a.created_at, a.heat_score,
           coalesce(a.thumb_url, a.creative_url) as thumb, p.name as pname, b.name as bname,
           public.is_eligible_product(p.name, b.name, p.category, p.offer_url, a.platform, p.niche::text) as elig,
           (a.creative_url like '%r2.dev%') as r2
    from ads a join brands b on b.id = a.brand_id left join products p on p.id = a.product_id
    where a.is_active and a.cluster_id is not null
  ),
  stats as (
    select cluster_id,
      count(*) filter (where r2)::int as n_ads,
      count(distinct brand_id)::int as n_sellers,                 -- CAŁY klaster (walidacja/nasycenie)
      min(created_at)::date as first_seen,
      (current_date - min(created_at)::date)::int as days_first,
      count(*) filter (where created_at >= now() - interval '7 days')::int as new_ads_7d,
      bool_or(public.norm_brand(bname) in (select sn from tt)) as cross_tiktok,
      bool_or(elig and r2) as has_eligible,
      (array_agg(pname order by (elig and r2) desc, heat_score desc nulls last))[1] as rep_name,
      (array_agg(bname order by (elig and r2) desc, heat_score desc nulls last))[1] as rep_brand,
      (array_agg(thumb order by (elig and r2) desc, heat_score desc nulls last))[1] as rep_thumb
    from cl group by cluster_id
  ),
  scored as (
    select *, round((
        p_aggro * (0.6 * greatest(0, 1 - days_first / 30.0) + 0.4 * least(new_ads_7d, 10) / 10.0)
        + (1 - p_aggro) * least(n_sellers, 5) / 5.0
        + (case when cross_tiktok then 0.15 else 0 end)
        - greatest(0, n_sellers - 8) * 0.05
      )::numeric, 3) as gem_score
    from stats where has_eligible          -- pokazuj tylko klastry z eligible+renderowalnym rep
  )
  select coalesce(jsonb_agg(to_jsonb(x) order by x.gem_score desc, x.n_ads desc), '[]'::jsonb)
  from (select cluster_id, n_ads, n_sellers, first_seen, days_first, new_ads_7d, cross_tiktok,
               rep_name, rep_brand, rep_thumb, gem_score from scored order by gem_score desc, n_ads desc limit p_limit) x;
$$;
grant execute on function public.fb_cluster_gems(int, numeric) to anon, authenticated, service_role;
