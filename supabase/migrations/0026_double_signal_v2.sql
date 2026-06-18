-- ════════════════════════════════════════════════════════════════════════
-- 0026_double_signal_v2 — podwójny sygnał FB×TikTok v2 (Część 6).
-- v1 = match po marce (seller_name TikTok == brand FB). v2 dokłada match po
-- DOMENIE offer_url FB: znormalizowany token sprzedawcy TikTok zawarty w hoście
-- offer_url reklamy FB (np. seller „OZBOBO" ↔ offer_url ozbobo.com). Łapie marki,
-- które na FB mają inną nazwę strony niż TikTok, ale ten sam sklep/domenę.
-- Zaznaczamy TYLKO przy PEWNYM dopasowaniu (marka LUB domena); generyczne tokeny = NIE.
-- ad_count = liczba reklam FB dopasowanej marki.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.tiktok_double_signals(p_region text default 'us')
returns table (product_id text, ad_count int) language sql stable set search_path = public as $$
  with tt as (
    select product_id,
           regexp_replace(lower(coalesce(seller_name, '')), '[^a-z0-9]', '', 'g') as seller_norm
    from tiktok_shop_products
    where region = p_region and not archived and seller_name is not null
  ),
  -- token sprzedawcy musi być dystynktywny — generyczne nazwy (beauty/shop/home…)
  -- dałyby fałszywe dopasowania do dowolnej domeny, więc je odrzucamy.
  tt_distinct as (
    select * from tt
    where length(seller_norm) >= 5
      and seller_norm not in ('beauty','shop','store','official','home','homedecor','kitchen',
        'gadget','gadgets','pets','fashion','health','mall','global','world','deals','direct',
        'outlet','original','market','studio','collective','tumbler','decor','living','essentials','online')
  ),
  fb as (
    select b.id as brand_id,
           regexp_replace(lower(coalesce(b.name, '')), '[^a-z0-9]', '', 'g') as brand_norm,
           -- host offer_url znormalizowany (alnum), pusty gdy brak/aggregator bez nazwy
           regexp_replace(lower(regexp_replace(coalesce(p.offer_url, ''), '^https?://([^/]+).*$', '\1')), '[^a-z0-9]', '', 'g') as host_norm
    from products p join brands b on b.id = p.brand_id
  ),
  matched as (
    select distinct tt.product_id, fb.brand_id
    from tt_distinct tt join fb on
      fb.brand_norm = tt.seller_norm                              -- v1: marka == sprzedawca
      or fb.host_norm like '%' || tt.seller_norm || '%'           -- v2: domena offer_url zawiera sprzedawcę
  ),
  adc as (select brand_id, count(*)::int as c from ads group by brand_id)
  select m.product_id, sum(coalesce(adc.c, 0))::int as ad_count
  from matched m left join adc on adc.brand_id = m.brand_id
  group by m.product_id
  having sum(coalesce(adc.c, 0)) > 0;
$$;
grant execute on function public.tiktok_double_signals(text) to anon, authenticated, service_role;
