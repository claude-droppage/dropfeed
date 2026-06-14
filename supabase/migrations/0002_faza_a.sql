-- ════════════════════════════════════════════════════════════════════════
-- 0002 — FAZA A: różnorodność feedu + dane deep dive + logo
-- Idempotentna. Aplikowana przez Supabase Management API (lub SQL Editor).
-- ════════════════════════════════════════════════════════════════════════

-- ─── Nowe kolumny ────────────────────────────────────────────────────────
alter table ads    add column if not exists platforms      text[] not null default '{}'; -- FACEBOOK/INSTAGRAM…
alter table ads    add column if not exists variants_count integer;                        -- collation_count (duplikaty kreacji)
alter table brands add column if not exists logo_url       text;                           -- profilówka strony (R2)

-- ─── RPC: strona feedu z limitem N reklam na markę ───────────────────────
-- Top p_per_brand reklam każdej marki (po heat), potem sort globalny po heat.
-- Filtry: tylko aktywne; opcjonalny offer_type; opcjonalny minimalny staż (dni
-- od start_date) — FAZA B ustawi próg jakości (np. 7 dni), FAZA A = 0.
drop function if exists feed_page(integer, integer, integer, text[], integer);

-- Zwraca gotowy jsonb (ad + zagnieżdżone brand/product) w poprawnej kolejności.
-- jsonb (nie setof ads + embedding), bo PostgREST przy embeddingu nie gwarantuje
-- zachowania ORDER BY funkcji.
create or replace function feed_page(
  p_offset       integer,
  p_limit        integer,
  p_per_brand    integer  default 10,
  p_offer_types  text[]   default null,
  p_min_age_days integer  default 0
)
returns setof jsonb
language sql
stable
as $$
  with ranked as (
    select a as rec,
           row_number() over (partition by a.brand_id order by a.heat_score desc, a.id) as rn
    from ads a
    where a.is_active = true
      and (current_date - a.start_date) >= p_min_age_days
      and (p_offer_types is null or a.offer_type::text = any(p_offer_types))
  )
  -- Przeplatanie marek (różnorodność jak TikTok): najpierw #1 każdej marki
  -- (po heat), potem #2 każdej itd. — żadna marka nie powtarza się w rundzie.
  select to_jsonb((rec))
         || jsonb_build_object('brand', to_jsonb(b), 'product', to_jsonb(p))
  from ranked
  left join brands   b on b.id = (rec).brand_id
  left join products p on p.id = (rec).product_id
  where rn <= p_per_brand
  order by rn, (rec).heat_score desc, (rec).id
  offset p_offset
  limit p_limit
$$;

grant execute on function feed_page(integer, integer, integer, text[], integer)
  to anon, authenticated, service_role;
