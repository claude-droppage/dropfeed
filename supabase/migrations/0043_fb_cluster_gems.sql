-- ════════════════════════════════════════════════════════════════════════
-- 0043_fb_cluster_gems — gem-score na poziomie KLASTRA (Perełki v1, COMPUTE/podgląd).
-- NOWE pole, NIE nadpisuje product_winners. Sygnały (real, z danych):
--   nowość   = jak świeży pierwszy raz widziany klaster (min created_at) → +
--   prędkość = reklamy klastra w ost. 7 dni (proxy „rośnie"; cluster-snapshoty = przyszłość) → +
--   walidacja= liczba RÓŻNYCH sprzedawców (MIĘKKA podłoga, nie twarda brama) → + do ~5
--   nasycenie= dużo sprzedawców (>8) = zatłoczone → KARA
--   cross    = marka klastra występuje też na TikTok (norm_brand) → +
-- p_aggro (0..1) = waga agresywności: nowość/prędkość vs walidacja (start 0.6 = umiarkowanie).
-- Klastry filtrowane przez is_eligible_product (bez kosmetyków/non-shopify) + renderowalne (R2).
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.fb_cluster_gems(p_limit int default 20, p_aggro numeric default 0.6)
returns jsonb language sql stable set search_path = public as $$
  with elig as (
    select a.id, a.cluster_id, a.brand_id, a.heat_score, a.created_at,
           coalesce(a.thumb_url, a.creative_url) as thumb, p.name as pname, b.name as bname
    from ads a join brands b on b.id = a.brand_id left join products p on p.id = a.product_id
    where a.is_active and a.cluster_id is not null and a.creative_url like '%r2.dev%'
      and public.is_eligible_product(p.name, b.name, p.category, p.offer_url, a.platform, p.niche::text)
  ),
  tt as (select distinct public.norm_brand(seller_name) as sn from tiktok_shop_products where not archived and seller_name is not null),
  agg as (
    select cluster_id,
      count(*)::int as n_ads, count(distinct brand_id)::int as n_sellers,
      min(created_at)::date as first_seen,
      (current_date - min(created_at)::date)::int as days_first,
      count(*) filter (where created_at >= now() - interval '7 days')::int as new_ads_7d,
      bool_or(public.norm_brand(bname) in (select sn from tt)) as cross_tiktok,
      (array_agg(pname order by heat_score desc nulls last))[1] as rep_name,
      (array_agg(bname order by heat_score desc nulls last))[1] as rep_brand,
      (array_agg(thumb order by heat_score desc nulls last))[1] as rep_thumb
    from elig group by cluster_id
  ),
  scored as (
    select *,
      round((
        p_aggro * (0.6 * greatest(0, 1 - days_first / 30.0) + 0.4 * least(new_ads_7d, 10) / 10.0)
        + (1 - p_aggro) * least(n_sellers, 5) / 5.0
        + (case when cross_tiktok then 0.15 else 0 end)
        - greatest(0, n_sellers - 8) * 0.05
      )::numeric, 3) as gem_score
    from agg
  )
  select coalesce(jsonb_agg(to_jsonb(x) order by x.gem_score desc), '[]'::jsonb)
  from (select * from scored order by gem_score desc, n_ads desc limit p_limit) x;
$$;
grant execute on function public.fb_cluster_gems(int, numeric) to anon, authenticated, service_role;
