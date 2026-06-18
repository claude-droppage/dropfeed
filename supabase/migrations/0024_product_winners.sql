-- ════════════════════════════════════════════════════════════════════════
-- 0024_product_winners — definicja+scoring zwycięzcy FB (Część 1). Filozofia
-- jak TikTok: NOWE+ROSNĄCE z karą za nasycenie, tylko realne sygnały, NIGDY $.
-- Sygnały (wszystkie z istniejących danych):
--   • stores_count = różni reklamodawcy na ten sam offer_url (walidacja: więcej=mocniej)
--   • new_ads_7d   = reklamy produktu zaciągnięte w ost. 7 dni (świeżo skalujący)
--   • momentum_delta = wzrost aktywnych reklam marki (brand_daily_snapshot)
--   • first_seen   = produkt pierwszy raz widziany niedawno → bonus świeżości
--   • oldest_age   = staż najstarszej aktywnej reklamy → KARA za nasycenie (ograne)
-- Wyklucza EXCL_RE (spójność z TikTokiem). Zwraca bogate wiersze (video/logo/wiek/
-- sklep) — to samo źródło dla kart „Produkty", kalendarza i pod-feedu Reklamy·PL.
-- ════════════════════════════════════════════════════════════════════════

-- Jedno źródło prawdy wykluczeń (SQL) — prefix-match (łapie polską fleksję:
-- „kolagenu", „kremu", „witaminy"). Mirror JS = EXCL_RE w scripts/tiktok-snapshot.ts.
create or replace function public.is_excluded_title(t text)
returns boolean language sql immutable set search_path = public as $$
  select lower(coalesce(t, '')) ~* '\m(cream|serum|ointment|balm|lotion|supplement|vitamin|collagen|capsule|gummies|gummy|skincare|krem|maść|masc|balsam|suplement|witamin|kolagen)|face ?mask'
$$;

create or replace function public.product_winners(p_limit int default 10, p_country text default null)
returns jsonb language sql stable set search_path = public as $$
  with active as (
    select id, product_id, brand_id, heat_score, thumb_url, creative_url, country, format,
           age_in_days, created_at
    from ads where is_active and product_id is not null
      and (p_country is null or country = p_country)
  ),
  stores as (
    select offer_url, count(distinct brand_id) as stores_count
    from products where offer_url is not null and offer_url <> '' group by offer_url
  ),
  mom as (
    select brand_id,
           ((array_agg(active_ads_count order by day desc))[1]
              - (array_agg(active_ads_count order by day asc))[1])::int as momentum_delta
    from brand_daily_snapshot where day >= current_date - 21 group by brand_id
  ),
  agg as (
    select p.id, p.name, p.niche, p.price_in_store, p.offer_url,
           b.name as brand_name, b.store_url, b.logo_url, b.avatar_initials,
           count(*)::int as ad_count,
           max(act.heat_score)::int as heat,
           min(act.age_in_days)::int as newest_age,
           max(act.age_in_days)::int as oldest_age,
           (current_date - min(act.created_at)::date)::int as first_seen_days,
           count(*) filter (where act.created_at >= now() - interval '7 days')::int as new_ads_7d,
           mode() within group (order by act.country) as country,
           bool_or(act.country is not null and act.country <> 'PL') as has_foreign,
           (array_agg(act.creative_url order by act.heat_score desc) filter (where act.format = 'video'))[1] as rep_video,
           (array_agg(coalesce(act.thumb_url, act.creative_url) order by act.heat_score desc))[1] as rep_thumb,
           coalesce(s.stores_count, 1)::int as stores_count,
           coalesce(m.momentum_delta, 0) as momentum_delta
    from products p
    join brands b on b.id = p.brand_id
    join active act on act.product_id = p.id
    left join stores s on s.offer_url = p.offer_url
    left join mom m on m.brand_id = p.brand_id
    where not public.is_excluded_title(p.name)
    group by p.id, p.name, p.niche, p.price_in_store, p.offer_url, b.name, b.store_url, b.logo_url,
             b.avatar_initials, s.stores_count, m.momentum_delta
  ),
  scored as (
    select *,
      ( ad_count * 2
        + least(stores_count, 10) * 8                      -- walidacja multi-advertiser (cap)
        + greatest(0, momentum_delta) * 5                  -- rosnące aktywne (momentum+)
        + new_ads_7d * 6                                   -- świeżo skalujący
        + (case when first_seen_days <= 14 then 25 else 0 end)  -- świeżość
        + (case when has_foreign then 10 else 0 end)       -- cross-market
        - greatest(0, oldest_age - 45) * 0.4               -- KARA za nasycenie (ograne)
      ) as score
    from agg
  ),
  -- dedup po ofercie (offer_url) — jeden funnel/affiliate (np. 19 reklamodawców tego
  -- samego linku) = JEDEN zwycięzca, nie 10 kopii. Reprezentant = najwyższy score.
  deduped as (
    select distinct on (coalesce(offer_url, id::text)) *
    from scored
    order by coalesce(offer_url, id::text), score desc
  )
  select coalesce(jsonb_agg(to_jsonb(x) order by x.score desc), '[]'::jsonb)
  from (
    select id as product_id, name, brand_name, logo_url, avatar_initials, niche,
           price_in_store as price, offer_url, store_url,
           ad_count, oldest_age, newest_age, first_seen_days, new_ads_7d,
           country, has_foreign, stores_count, momentum_delta, heat,
           rep_video, rep_thumb,
           (rep_video is not null) as is_video,
           (first_seen_days <= 7) as is_fresh,
           (stores_count >= 3) as is_validated,
           (momentum_delta > 0 or new_ads_7d > 0) as is_scaling,
           round(score, 1) as score
    from deduped
    order by score desc
    limit p_limit
  ) x;
$$;
grant execute on function public.product_winners(int, text) to anon, authenticated, service_role;

-- Spójność z TikTokiem: przelicz flagę excluded tą samą (ulepszoną, prefix-match)
-- definicją — łapie teraz polską fleksję pominiętą wcześniej (0020).
update public.tiktok_shop_products set excluded = public.is_excluded_title(title)
where excluded is distinct from public.is_excluded_title(title);
