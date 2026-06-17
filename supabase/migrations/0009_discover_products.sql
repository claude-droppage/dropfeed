-- ════════════════════════════════════════════════════════════════════════
-- 0009_discover_products — derywacja produktów z reklam FB (Faza 1, F1a)
-- Produkt = istniejący wiersz products (klaster reklam po ads.product_id).
-- Liczymy: aktywne reklamy + liczbę różnych sklepów (po DOKŁADNYM offer_url —
-- domena odrzucona, bo skracacze/platformy typu peakshort.com zaszumiają).
-- RPC read-only na treści publicznej (RLS pozwala select wszystkim). F1b doda
-- sygnały (momentum/świeżość/cross-market) do tych funkcji.
-- ════════════════════════════════════════════════════════════════════════

-- liczba różnych marek reklamujących ten sam dokładny offer_url
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
  agg as (
    select p.id, p.name, p.niche, p.price_in_store, p.offer_url,
           b.name as brand_name, b.store_url,
           count(*)::int as ad_count,
           max(act.heat_score)::int as heat,
           (array_agg(coalesce(act.thumb_url, act.creative_url) order by act.heat_score desc))[1] as rep_thumb,
           coalesce(s.stores_count, 1)::int as stores_count
    from products p
    join brands b on b.id = p.brand_id
    join active act on act.product_id = p.id
    left join stores s on s.offer_url = p.offer_url
    group by p.id, p.name, p.niche, p.price_in_store, p.offer_url, b.name, b.store_url, s.stores_count
  )
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
  from (select * from agg order by heat desc nulls last limit p_limit) x;
$$;

create or replace function public.product_detail(p_id text)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'niche', p.niche,
    'price', p.price_in_store,
    'offer_url', p.offer_url,
    'brand_name', b.name,
    'store_url', b.store_url,
    'ad_count', (select count(*) from ads a where a.product_id = p.id and a.is_active),
    'heat', (select max(heat_score) from ads a where a.product_id = p.id and a.is_active),
    'oldest_age', (select max(age_in_days) from ads a where a.product_id = p.id and a.is_active),
    'newest_age', (select min(age_in_days) from ads a where a.product_id = p.id and a.is_active),
    'markets', (select array_agg(distinct country) from ads a where a.product_id = p.id and a.is_active and country is not null),
    'formats', (select array_agg(distinct format::text) from ads a where a.product_id = p.id and a.is_active),
    'ads', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', a.id, 'thumb_url', coalesce(a.thumb_url, a.creative_url),
        'heat', a.heat_score, 'format', a.format
      ) order by a.heat_score desc), '[]'::jsonb)
      from ads a where a.product_id = p.id and a.is_active
    )
  )
  from products p left join brands b on b.id = p.brand_id
  where p.id::text = p_id;
$$;

grant execute on function public.discover_products(int) to anon, authenticated;
grant execute on function public.product_detail(text) to anon, authenticated;
