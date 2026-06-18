-- ════════════════════════════════════════════════════════════════════════
-- 0017_tiktok_movers — velocity + rank-delta ze snapshotów (Część 2).
-- PRIMARY = rank_delta (skok searchRank, odporny na zaokrąglenie).
-- SECONDARY = sold_7d (bezwzględne sztuki/7d, znormalizowane per dzień przy luce).
-- sold_24h tylko gdy dwa kolejne snapshoty oddalone o 1 dzień. <2 snapshoty → null.
-- series = dzienne NOWE sztuki (do sparkline; mint, nie $).
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.tiktok_movers(p_region text default 'us')
returns table (
  product_id text, n_snaps int, latest_day date, latest_sales bigint, latest_rank int,
  rank_delta int, sold_24h bigint, sold_7d numeric, series jsonb
)
language sql stable set search_path = public as $$
  with s as (
    select sn.product_id, sn.day, sn.sales_volume, sn.rank,
           row_number() over (partition by sn.product_id order by sn.day desc) as rn_desc,
           lag(sn.sales_volume) over (partition by sn.product_id order by sn.day) as prev_sales
    from tiktok_shop_snapshot sn
    join tiktok_shop_products p on p.product_id = sn.product_id
    where p.region = p_region
  ),
  agg as (select product_id, count(*)::int as n_snaps from s group by product_id),
  latest as (select product_id, sales_volume as latest_sales, rank as latest_rank, day as latest_day from s where rn_desc = 1),
  prev as (select product_id, sales_volume as prev_sales, rank as prev_rank, day as prev_day from s where rn_desc = 2),
  -- najświeższy snapshot starszy niż latest_day - 7 (okno tygodniowe)
  seven as (
    select s.product_id,
           (array_agg(s.sales_volume order by s.day desc))[1] as sales7,
           (array_agg(s.day order by s.day desc))[1] as day7
    from s join latest l on l.product_id = s.product_id
    where s.day <= l.latest_day - 7
    group by s.product_id
  ),
  ser as (
    select product_id,
           jsonb_agg(jsonb_build_object(
             'date', day,
             'daily_units', case when prev_sales is not null and sales_volume - prev_sales >= 0
                                 then sales_volume - prev_sales else null end
           ) order by day) as series
    from s group by product_id
  )
  select a.product_id, a.n_snaps, l.latest_day, l.latest_sales, l.latest_rank,
         case when a.n_snaps >= 2 and pr.prev_rank is not null and l.latest_rank is not null
              then pr.prev_rank - l.latest_rank end as rank_delta,
         case when a.n_snaps >= 2 and pr.prev_day = l.latest_day - 1
              then l.latest_sales - pr.prev_sales end as sold_24h,
         case when sv.sales7 is not null and l.latest_day > sv.day7
              then round((l.latest_sales - sv.sales7)::numeric / (l.latest_day - sv.day7) * 7, 0) end as sold_7d,
         case when a.n_snaps >= 2 then se.series end as series
  from agg a
  join latest l on l.product_id = a.product_id
  left join prev pr on pr.product_id = a.product_id
  left join seven sv on sv.product_id = a.product_id
  left join ser se on se.product_id = a.product_id;
$$;
grant execute on function public.tiktok_movers(text) to anon, authenticated, service_role;
