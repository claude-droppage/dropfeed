-- ════════════════════════════════════════════════════════════════════════
-- 0051_winners_fresh_featured — nowy model dziennych propozycji (Część 2).
-- product_winners = wyłącznie ŚWIEŻE, nigdy niepowtórzone.
--   źródło: is_eligible_product + reklama aktywna ≥7 dni + NIE featured (z dni
--           poprzednich: featured_at::date < current_date)
--   sort:   najnowszy ingest (min(created_at) DESC = first_seen DESC)
--   różnorodność: dedup offer_url + 1 produkt/markę + niche-cap (domyślnie 3)
--   top N. BEZ tieringu, BEZ okna 7-dniowego (zastąpione flagą), BEZ kary za staż.
-- snapshot_product_winners() zapisuje top-10 do pdw I oznacza je featured_at.
-- Sygnatura zmieniona na (p_limit, p_country, p_niche_cap) — drop starych overloadów.
-- ════════════════════════════════════════════════════════════════════════

drop function if exists public.product_winners(int, text, boolean, boolean, int);
drop function if exists public.product_winners(int, text, boolean, boolean);

create or replace function public.product_winners(
  p_limit int default 10, p_country text default null, p_niche_cap int default 3
)
returns jsonb language sql stable set search_path = public as $$
  with active as (
    select id, product_id, brand_id, heat_score, thumb_url, creative_url, country, format, age_in_days, created_at, platform, landing_type
    from ads where is_active and product_id is not null and (p_country is null or country = p_country)
  ),
  brand_real as (select brand_id, fb_total from brand_active_total where fetched_at > now() - interval '14 days'),
  brand_snap as (select distinct on (brand_id) brand_id, active_ads_count as snap_ads from brand_daily_snapshot order by brand_id, day desc),
  stored_ads as (select brand_id, count(*)::int as c from ads where is_active group by brand_id),
  stores as (select offer_url, count(distinct brand_id) as stores_count from products where offer_url is not null and offer_url <> '' group by offer_url),
  mom as (
    select brand_id, ((array_agg(active_ads_count order by day desc))[1] - (array_agg(active_ads_count order by day asc))[1])::int as momentum_delta
    from brand_daily_snapshot where day >= current_date - 21 group by brand_id
  ),
  agg as (
    select p.id, p.brand_id, p.name, p.niche, p.category, p.price_in_store, p.offer_url,
           b.name as brand_name, b.store_url, b.logo_url, b.avatar_initials, b.fb_page_id,
           min(act.created_at) as first_ingest,
           count(*)::int as ad_count, max(act.heat_score)::int as heat,
           min(act.age_in_days)::int as newest_age, max(act.age_in_days)::int as oldest_age,
           (current_date - min(act.created_at)::date)::int as first_seen_days,
           count(*) filter (where act.created_at >= now() - interval '7 days')::int as new_ads_7d,
           mode() within group (order by act.country) as country,
           bool_or(act.country is not null and act.country <> 'PL') as has_foreign,
           (array_agg(act.creative_url order by act.heat_score desc) filter (where act.format = 'video'))[1] as rep_video,
           (array_agg(coalesce(act.thumb_url, act.creative_url) order by act.heat_score desc))[1] as rep_thumb,
           coalesce(s.stores_count, 1)::int as stores_count,
           coalesce(m.momentum_delta, 0) as momentum_delta,
           coalesce(br.fb_total, bs.snap_ads, sa.c, count(*))::int as active_brand_ads,
           mode() within group (order by act.platform) as platform,
           bool_or(act.landing_type = 'product') as has_product_page
    from products p
    join brands b on b.id = p.brand_id
    join active act on act.product_id = p.id
    left join stores s on s.offer_url = p.offer_url
    left join mom m on m.brand_id = p.brand_id
    left join brand_real br on br.brand_id = p.brand_id
    left join brand_snap bs on bs.brand_id = p.brand_id
    left join stored_ads sa on sa.brand_id = p.brand_id
    -- NIE featured w dniach poprzednich (dziś-featured zostaje → idempotencja snapshotu)
    where (p.featured_at is null or p.featured_at::date >= current_date)
    group by p.id, p.brand_id, p.name, p.niche, p.category, p.price_in_store, p.offer_url, b.name, b.store_url, b.logo_url,
             b.avatar_initials, b.fb_page_id, s.stores_count, m.momentum_delta, br.fb_total, bs.snap_ads, sa.c
  ),
  -- reklama aktywna ≥7 dni + wspólny filtr eligibility (Shopify/beauty/blocklista/non-produkt/wykluczenia)
  floored as (
    select * from agg
    where oldest_age >= 7 and public.is_eligible_product(name, brand_name, category, offer_url, platform, niche::text)
  ),
  -- dedup offer_url (jeden funnel = jeden), najnowszy ingest wygrywa
  dedup_offer as (select distinct on (coalesce(offer_url, id::text)) * from floored order by coalesce(offer_url, id::text), first_ingest desc),
  -- jeden produkt na markę (najnowszy ingest)
  dedup_brand as (select * from (select *, row_number() over (partition by brand_id order by first_ingest desc) as brn from dedup_offer) t where brn = 1),
  -- niche-cap (max p_niche_cap na branżę, najnowsze)
  capped as (select * from (select *, row_number() over (partition by niche order by first_ingest desc) as nrn from dedup_brand) t where nrn <= p_niche_cap),
  ranked as (
    select *,
      (active_brand_ads >= 30) as is_proven_b,
      (active_brand_ads + new_ads_7d * 4 + greatest(0, momentum_delta) * 3 + least(stores_count, 10) * 4 + (case when has_product_page then 8 else 0 end)) as score,
      row_number() over (order by first_ingest desc) as rn
    from capped
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'product_id', id, 'name', name, 'brand_name', brand_name, 'logo_url', logo_url, 'avatar_initials', avatar_initials, 'page_id', fb_page_id,
      'niche', niche, 'price', price_in_store, 'offer_url', offer_url, 'store_url', store_url, 'ad_count', ad_count,
      'oldest_age', oldest_age, 'newest_age', newest_age, 'first_seen_days', first_seen_days, 'new_ads_7d', new_ads_7d,
      'country', country, 'has_foreign', has_foreign, 'stores_count', stores_count, 'momentum_delta', momentum_delta,
      'heat', heat, 'active_brand_ads', active_brand_ads, 'platform', platform, 'has_product_page', has_product_page, 'rep_video', rep_video, 'rep_thumb', rep_thumb,
      'is_video', (rep_video is not null), 'is_fresh', (not is_proven_b), 'is_validated', (stores_count >= 3),
      'is_scaling', (momentum_delta > 0 or new_ads_7d > 0),
      'tier', (case when is_proven_b then 'proven' else 'fresh' end), 'score', round(score, 1)
    ) order by rn), '[]'::jsonb)
  from ranked where rn <= p_limit;
$$;
grant execute on function public.product_winners(int, text, int) to anon, authenticated, service_role;

-- snapshot dnia: zapisz top-10 do pdw I OZNACZ je featured_at (trwale, raz).
create or replace function public.snapshot_product_winners(p_limit int default 10)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from products_daily_winners where day = current_date or day < current_date - 8;
  insert into products_daily_winners (day, product_id, rank, score, signals)
  select current_date, (w->>'product_id')::uuid, ord::int, (w->>'score')::numeric, w
  from jsonb_array_elements(public.product_winners(p_limit, null, 3)) with ordinality as t(w, ord);
  get diagnostics n = row_count;
  -- trwałe oznaczenie dzisiejszej 10-tki (raz; ponowny run tego samego dnia nie nadpisuje)
  update public.products set featured_at = now()
  where id in (select product_id from products_daily_winners where day = current_date)
    and featured_at is null;
  return n;
end;
$$;
grant execute on function public.snapshot_product_winners(int) to service_role;
