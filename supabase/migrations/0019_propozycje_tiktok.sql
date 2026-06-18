-- ════════════════════════════════════════════════════════════════════════
-- 0019_propozycje_tiktok — RPC rdzenia (Część 4). Składa typ_dnia + movers.
-- Selekcja DO 20/dzień z aktywnego zestawu (nie-archived), próg min. sprzedaży
-- ucina szum z malutkich. Sygnał ruchu: rank_delta (PRIMARY) → sold_7d (≥7 dni)
-- → sold_24h (early). Kwalifikuje TYLKO realny wzrost; jak kwalifikuje się 6 —
-- zwraca 6 (jakość > liczba, NIGDY nie dopycha). Typ dnia preferuje podwójny sygnał.
-- track_record = placeholder (null) do czasu historii ≥14 dni. Twarde dane: sztuki/rank.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.propozycje_tiktok(p_region text default 'us', p_min_sales bigint default 50, p_limit int default 20)
returns jsonb language sql stable set search_path = public as $$
  with cand as (
    select p.product_id, p.title, p.image_url, p.product_url, p.current_price, p.rating, p.review_count,
           p.seller_name, p.tracking_started_at,
           m.latest_sales, m.latest_rank, m.rank_delta, m.sold_24h, m.sold_7d, m.n_snaps, m.series,
           (current_date - p.tracking_started_at) as days_tracked,
           coalesce(ds.ad_count, 0) as ad_count,
           (ds.product_id is not null) as is_double,
           -- score: rank_delta PRIMARY, potem velocity sztukowe (7d → 24h)
           (coalesce(m.rank_delta, 0) * 1000000)
             + coalesce(m.sold_7d, m.sold_24h, 0) as score
    from tiktok_shop_products p
    join tiktok_movers(p_region) m on m.product_id = p.product_id
    left join tiktok_double_signals(p_region) ds on ds.product_id = p.product_id
    where p.region = p_region and not p.archived
      and m.n_snaps >= 2
      and coalesce(m.latest_sales, 0) >= p_min_sales
      and (coalesce(m.rank_delta, 0) > 0 or coalesce(m.sold_7d, 0) > 0 or coalesce(m.sold_24h, 0) > 0)
  ),
  ranked as (
    select *,
           row_number() over (order by score desc, latest_sales desc) as rn_score,
           row_number() over (order by is_double desc, score desc, latest_sales desc) as rn_pick
    from cand
  ),
  obj as (
    select product_id, rn_score, rn_pick,
           jsonb_build_object(
             'product_id', product_id, 'title', title, 'image_url', image_url, 'product_url', product_url,
             'price', current_price, 'rating', rating, 'review_count', review_count,
             'sales_volume', latest_sales, 'rank', latest_rank, 'rank_delta', rank_delta,
             'sold_24h', sold_24h, 'sold_7d', sold_7d, 'n_snaps', n_snaps,
             'is_double', is_double, 'ad_count', ad_count,
             'is_fresh', (days_tracked < 7), 'days_tracked', days_tracked,
             'series', series
           ) as j
    from ranked
  )
  select jsonb_build_object(
    'typ_dnia', (select j from obj where rn_pick = 1),
    'movers', coalesce((
      select jsonb_agg(j order by rn_score)
      from obj
      where product_id <> coalesce((select product_id from obj where rn_pick = 1), '')
        and rn_score <= p_limit
    ), '[]'::jsonb),
    'track_record', null,
    'meta', jsonb_build_object(
      'updated_day', (select max(day) from tiktok_shop_snapshot),
      'qualifying', (select count(*) from cand),
      'active_count', (select count(*) from tiktok_shop_products where region = p_region and not archived),
      'fresh_count', (select count(*) from tiktok_shop_products where region = p_region and not archived and (current_date - tracking_started_at) < 7)
    )
  );
$$;
grant execute on function public.propozycje_tiktok(text, bigint, int) to anon, authenticated, service_role;
