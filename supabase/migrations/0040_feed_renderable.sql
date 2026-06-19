-- ════════════════════════════════════════════════════════════════════════
-- 0040_feed_renderable — swipe feed pokazuje TYLKO renderowalne kreacje (R2).
-- FB CDN wygasa → czarne karty. Warunek: creative_url na R2 (pub-…r2.dev). Bezpieczne:
-- feed i tak ma próg ≥7 dni, a rehost (codziennie) mirroruje świeże w tym oknie → nie ukrywa
-- realnych, tylko zwietrzałe niezmirrorowane (nieodzyskiwalne). Winnerzy: pool eligible = R2.
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.feed_shuffle(p_offset int, p_limit int, p_seed bigint default 0, p_offer_types text[] default null, p_min_age_days int default 7)
returns setof jsonb language sql stable set search_path = public as $BODY$
  select to_jsonb(a) || jsonb_build_object('brand', to_jsonb(b), 'product', to_jsonb(p))
  from ads a
  join brands b on b.id = a.brand_id
  left join products p on p.id = a.product_id
  where a.is_active
    and (current_date - a.start_date) >= p_min_age_days
    and (p_offer_types is null or a.offer_type::text = any(p_offer_types))
    and a.creative_url like '%r2.dev%'                         -- renderowalne: zmirrorowane na R2
    and public.is_eligible_product(p.name, b.name, p.category, p.offer_url, a.platform)
  order by md5(a.id::text || ':' || p_seed::text)
  offset p_offset limit p_limit;
$BODY$;
grant execute on function public.feed_shuffle(int, int, bigint, text[], int) to anon, authenticated, service_role;
