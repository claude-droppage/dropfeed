-- ════════════════════════════════════════════════════════════════════════
-- 0028_product_detail_all_creatives — deep-dive: WSZYSTKIE kreatywy (Dodatek A).
-- „Reklamy tego produktu" pokazuje wszystkie aktywne kreatywy (są w R2, zero kosztu),
-- klikalne (play) — dorzucamy creative_url. Dedup: identyczna kreacja (ten sam
-- creative_url) = jeden kafelek (distinct on creative_url, reprezentant = top heat).
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.product_detail(p_id text)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'name', p.name, 'niche', p.niche, 'price', p.price_in_store,
    'offer_url', p.offer_url, 'brand_name', b.name, 'store_url', b.store_url,
    'ad_count', (select count(*) from ads a where a.product_id = p.id and a.is_active),
    'heat', (select max(heat_score) from ads a where a.product_id = p.id and a.is_active),
    'oldest_age', (select max(age_in_days) from ads a where a.product_id = p.id and a.is_active),
    'newest_age', (select min(age_in_days) from ads a where a.product_id = p.id and a.is_active),
    'markets', (select array_agg(distinct country) from ads a where a.product_id = p.id and a.is_active and country is not null),
    'formats', (select array_agg(distinct format::text) from ads a where a.product_id = p.id and a.is_active),
    'ads', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', d.id, 'thumb_url', d.thumb_url, 'creative_url', d.creative_url,
        'heat', d.heat, 'format', d.format
      ) order by d.heat desc), '[]'::jsonb)
      from (
        -- dedup po creative_url: identyczna kreacja = 1 kafelek (reprezentant = top heat)
        select distinct on (a.creative_url)
               a.id, a.creative_url, coalesce(a.thumb_url, a.creative_url) as thumb_url,
               a.heat_score as heat, a.format
        from ads a where a.product_id = p.id and a.is_active
        order by a.creative_url, a.heat_score desc
      ) d
    )
  )
  from products p left join brands b on b.id = p.brand_id
  where p.id::text = p_id;
$$;
grant execute on function public.product_detail(text) to anon, authenticated, service_role;
