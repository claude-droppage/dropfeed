-- ════════════════════════════════════════════════════════════════════════
-- 0021_tiktok_scored_gems — logika perełek (Część A) + reframe propozycje (B).
-- Perełka = NOWE + ROSNĄCE z KARĄ ZA NASYCENIE. Wzrost względny + świeżość PONAD
-- absolutny lifetime: gem_score = rank_delta(PRIMARY) → sold_7d → sold_24h,
-- velocity skalowane w dół przy dużym lifetime (kara za nasycenie), bonusy za
-- świeżość (×1.25) i podwójny sygnał (×1.5). Giganci (lifetime > próg) = nie-perełki.
-- Dzień 1: świeżość i sold_24h liczą się od razu (nie czekamy na rank-delta).
-- Wyklucza kategorie konsumpcyjne (excluded) na WSZYSTKICH powierzchniach.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.tiktok_scored(
  p_region text default 'us', p_min_sales bigint default 50, p_sat_lifetime bigint default 100000
)
returns table (
  product_id text, title text, image_url text, product_url text, current_price numeric,
  rating numeric, review_count int, sales_volume bigint, seller_name text, category text,
  latest_rank int, rank_delta int, sold_24h bigint, sold_7d numeric, n_snaps int, series jsonb,
  days_tracked int, is_fresh boolean, is_double boolean, ad_count int,
  is_saturated boolean, is_gem boolean, gem_score numeric
)
language sql stable set search_path = public as $$
  select
    p.product_id, p.title, p.image_url, p.product_url, p.current_price,
    p.rating, p.review_count, p.sales_volume, p.seller_name, p.query as category,
    m.latest_rank, m.rank_delta, m.sold_24h, m.sold_7d, coalesce(m.n_snaps, 1) as n_snaps, m.series,
    (current_date - p.tracking_started_at) as days_tracked,
    ((current_date - p.tracking_started_at) < 7) as is_fresh,
    (ds.product_id is not null) as is_double,
    coalesce(ds.ad_count, 0) as ad_count,
    (coalesce(p.sales_volume, 0) > p_sat_lifetime) as is_saturated,
    -- perełka: nie-nasycona, min. sprzedaż, z realnym sygnałem (wzrost LUB świeżość LUB podwójny)
    (coalesce(p.sales_volume, 0) <= p_sat_lifetime
      and coalesce(p.sales_volume, 0) >= p_min_sales
      and (coalesce(m.rank_delta, 0) > 0 or coalesce(m.sold_7d, 0) > 0 or coalesce(m.sold_24h, 0) > 0
           or (current_date - p.tracking_started_at) < 7 or ds.product_id is not null)) as is_gem,
    -- score: rank-delta dominuje; velocity skalowane karą za nasycenie; bonusy świeżość/podwójny
    ((coalesce(m.rank_delta, 0) * 100000
      + coalesce(m.sold_7d, m.sold_24h, 0) * (1.0 / (1 + coalesce(p.sales_volume, 0) / 100000.0)))
     * (case when (current_date - p.tracking_started_at) < 7 then 1.25 else 1 end)
     * (case when ds.product_id is not null then 1.5 else 1 end)) as gem_score
  from tiktok_shop_products p
  left join tiktok_movers(p_region) m on m.product_id = p.product_id
  left join tiktok_double_signals(p_region) ds on ds.product_id = p.product_id
  where p.region = p_region and not p.archived and not p.excluded;
$$;
grant execute on function public.tiktok_scored(text, bigint, bigint) to anon, authenticated, service_role;

-- ── reframe propozycje_tiktok: perełki zamiast bestsellerów ──────────────────
create or replace function public.propozycje_tiktok(p_region text default 'us', p_min_sales bigint default 50, p_limit int default 20)
returns jsonb language sql stable set search_path = public as $$
  with g as (
    select * from tiktok_scored(p_region, p_min_sales) where is_gem
  ),
  ranked as (
    select *,
           row_number() over (order by gem_score desc, sales_volume desc) as rn_score,
           row_number() over (order by is_double desc, gem_score desc, sales_volume desc) as rn_pick
    from g
  ),
  obj as (
    select product_id, rn_score, rn_pick,
           jsonb_build_object(
             'product_id', product_id, 'title', title, 'image_url', image_url, 'product_url', product_url,
             'price', current_price, 'rating', rating, 'review_count', review_count,
             'sales_volume', sales_volume, 'rank', latest_rank, 'rank_delta', rank_delta,
             'sold_24h', sold_24h, 'sold_7d', sold_7d, 'n_snaps', n_snaps,
             'is_double', is_double, 'ad_count', ad_count,
             'is_fresh', is_fresh, 'days_tracked', days_tracked, 'series', series
           ) as j
    from ranked
  )
  select jsonb_build_object(
    'typ_dnia', (select j from obj where rn_pick = 1),
    'movers', coalesce((
      select jsonb_agg(j order by rn_score) from obj
      where product_id <> coalesce((select product_id from obj where rn_pick = 1), '') and rn_score <= p_limit
    ), '[]'::jsonb),
    'track_record', null,
    'meta', jsonb_build_object(
      'updated_day', (select max(day) from tiktok_shop_snapshot),
      'qualifying', (select count(*) from g),
      'shown', least((select count(*) from g), p_limit),
      'tracked_count', (select count(*) from tiktok_shop_products where region = p_region and not archived and not excluded),
      'active_count', (select count(*) from tiktok_shop_products where region = p_region and not archived and not excluded),
      'fresh_count', least((select count(*) from g), p_limit)
    )
  );
$$;
grant execute on function public.propozycje_tiktok(text, bigint, int) to anon, authenticated, service_role;
