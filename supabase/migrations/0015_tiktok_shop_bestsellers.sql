-- 0015 — RPC pod desktopową tabelę /shop (P3). Produkty + seria snapshotów
-- (sparkline), wzrost % (≥2 dni; inaczej null), liczba twórców (z cache wideo).
-- Sort sprzedaż DESC. Tylko twarde dane.
create or replace function public.tiktok_shop_bestsellers(p_region text default 'us', p_limit int default 50)
returns jsonb language sql stable set search_path = public as $$
  with snaps as (
    select product_id,
           array_agg(sales_volume order by day) as series,
           count(*) as days,
           (array_agg(sales_volume order by day desc))[1] as latest,
           (array_agg(sales_volume order by day asc))[1] as earliest
    from tiktok_shop_snapshot group by product_id
  ),
  creators as (
    select product_id, count(distinct author)::int as creators_count
    from tiktok_shop_video where author is not null group by product_id
  )
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
  from (
    select p.product_id, p.title, p.image_url, p.product_url, p.current_price, p.sales_volume,
           p.rating, p.review_count, p.first_live_time,
           coalesce(c.creators_count, 0) as creators_count,
           case when s.days >= 2 and s.earliest > 0
                then round(((s.latest - s.earliest)::numeric / s.earliest) * 100, 1)
                else null end as growth_pct,
           case when s.days >= 2 then s.series else null end as sales_series
    from tiktok_shop_products p
    left join snaps s on s.product_id = p.product_id
    left join creators c on c.product_id = p.product_id
    where p.region = p_region
    order by p.sales_volume desc nulls last
    limit p_limit
  ) x;
$$;
grant execute on function public.tiktok_shop_bestsellers(text, int) to anon, authenticated;
