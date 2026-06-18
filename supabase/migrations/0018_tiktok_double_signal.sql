-- ════════════════════════════════════════════════════════════════════════
-- 0018_tiktok_double_signal — podwójny sygnał FB×TikTok (Część 3, v1 heurystyka).
-- KONSERWATYWNIE: dopasowanie TYLKO po znormalizowanej nazwie marki
-- (seller_name TikTok == brand FB). Overlap generycznych słów tytułu = szum →
-- NIE używamy. Zaznaczamy double TYLKO przy pewnym dopasowaniu marki; brak → false.
-- Zwraca ad_count = liczba reklam FB tej marki. (PL FB vs US TikTok → zwykle 0 — OK.)
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.tiktok_double_signals(p_region text default 'us')
returns table (product_id text, ad_count int)
language sql stable set search_path = public as $$
  with tt as (
    select product_id,
           regexp_replace(lower(coalesce(seller_name, '')), '[^a-z0-9]', '', 'g') as seller_norm
    from tiktok_shop_products
    where region = p_region and not archived and seller_name is not null
  ),
  fb as (
    select b.id, regexp_replace(lower(coalesce(b.name, '')), '[^a-z0-9]', '', 'g') as brand_norm
    from brands b
  ),
  adc as (select brand_id, count(*)::int as c from ads group by brand_id)
  select tt.product_id, coalesce(adc.c, 0) as ad_count
  from tt
  join fb on length(tt.seller_norm) >= 4 and fb.brand_norm = tt.seller_norm
  join adc on adc.brand_id = fb.id
  where coalesce(adc.c, 0) > 0;
$$;
grant execute on function public.tiktok_double_signals(text) to anon, authenticated, service_role;
