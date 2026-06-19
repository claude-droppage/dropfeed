-- ════════════════════════════════════════════════════════════════════════
-- 0046_feed_diverse — feed maks. różnorodny (Część B). Shopify+eligible+R2 zostają.
--  • zwiń spam: jeden reprezentant per cluster_id (deterministycznie per seed) — koniec ×N tej samej.
--  • interleave po niche: round-robin (partition by niche order shuf) → sąsiednie karty z RÓŻNYCH branż.
--  • dalej losowy (seed), ale rozproszony. Paginacja stabilna per seed (bez duplikatów).
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.feed_shuffle(p_offset int, p_limit int, p_seed bigint default 0, p_offer_types text[] default null, p_min_age_days int default 7)
returns setof jsonb language sql stable set search_path = public as $BODY$
  with base as (
    select a.id, a.cluster_id, p.niche::text as niche,
           to_jsonb(a) || jsonb_build_object('brand', to_jsonb(b), 'product', to_jsonb(p)) as j,
           md5(a.id::text || ':' || p_seed::text) as shuf
    from ads a join brands b on b.id = a.brand_id left join products p on p.id = a.product_id
    where a.is_active and (current_date - a.start_date) >= p_min_age_days
      and (p_offer_types is null or a.offer_type::text = any(p_offer_types))
      and a.creative_url like '%r2.dev%'
      and public.is_eligible_product(p.name, b.name, p.category, p.offer_url, a.platform, p.niche::text)
  ),
  rep as ( -- jeden reprezentant per klaster (null cluster = osobny); wybór deterministyczny per seed
    select distinct on (coalesce(cluster_id::text, 'a' || id::text)) j, niche, shuf
    from base order by coalesce(cluster_id::text, 'a' || id::text), shuf
  ),
  inter as (select j, niche, row_number() over (partition by niche order by shuf) as rn from rep)
  select j from inter
  order by rn, md5(coalesce(niche, '') || ':' || p_seed::text)   -- round-robin po niche + losowa kolejność branż
  offset p_offset limit p_limit;
$BODY$;
grant execute on function public.feed_shuffle(int, int, bigint, text[], int) to anon, authenticated, service_role;
