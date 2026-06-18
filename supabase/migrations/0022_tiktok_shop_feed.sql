-- ════════════════════════════════════════════════════════════════════════
-- 0022_tiktok_shop_feed — feed /shop (Część D). Reframe: perełki na górze +
-- pełny ogon rise-first. Zwraca jsonb:
--   gems  = perełki (is_gem) wg gem_score (karuzela), z 'signal' (rank/fresh/double)
--   all   = PEŁNY aktywny zestaw (minus excluded), rise-first (rank_delta→sold_24h→lifetime).
--           KAŻDY produkt renderowany — sygnał wzrostu to wzbogacenie, nie filtr.
--           Giganci nasyceni zostają tu (i pod sortem „Bestsellery" po stronie UI).
--   counts= { tracked, gems }
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.tiktok_shop_feed(p_region text default 'us', p_gem_limit int default 15)
returns jsonb language sql stable set search_path = public as $$
  with s as (select * from tiktok_scored(p_region)),
  item as (
    select s.*, jsonb_build_object(
      'product_id', product_id, 'title', title, 'image_url', image_url, 'product_url', product_url,
      'price', current_price, 'rating', rating, 'review_count', review_count,
      'sales_volume', sales_volume, 'rank', latest_rank, 'rank_delta', rank_delta,
      'sold_24h', sold_24h, 'sold_7d', sold_7d, 'series', series,
      'is_fresh', is_fresh, 'days_tracked', days_tracked, 'is_double', is_double, 'ad_count', ad_count,
      'is_saturated', is_saturated, 'is_gem', is_gem, 'gem_score', round(gem_score, 2),
      'signal', case when is_double then 'double'
                     when coalesce(rank_delta,0) > 0 then 'rank'
                     when is_fresh then 'fresh' else 'rise' end
    ) as j
    from s
  )
  select jsonb_build_object(
    'gems', coalesce((
      select jsonb_agg(j order by ord)
      from (
        select j, row_number() over (order by gem_score desc, sales_volume desc) as ord
        from item where is_gem and gem_score > 0
        order by gem_score desc, sales_volume desc
        limit p_gem_limit
      ) t
    ), '[]'::jsonb),
    'all', coalesce((
      select jsonb_agg(j order by coalesce(rank_delta,0) desc, coalesce(sold_24h,0) desc, sales_volume desc nulls last)
      from item
    ), '[]'::jsonb),
    'counts', jsonb_build_object(
      'tracked', (select count(*) from item),
      'gems', (select count(*) from item where is_gem and gem_score > 0)
    )
  );
$$;
grant execute on function public.tiktok_shop_feed(text, int) to anon, authenticated, service_role;
