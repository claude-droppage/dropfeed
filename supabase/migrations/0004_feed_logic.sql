-- ════════════════════════════════════════════════════════════════════════
-- 0004 — logika feedu (PRD §11): seed-jitter + miękkie ważenie nisz + różnorodność
-- Deterministyczny porządek z (seed, preferencje, wagi) → stabilne stronicowanie
-- infinite scroll (brak duplikatów). Idempotentna.
-- ════════════════════════════════════════════════════════════════════════

drop function if exists feed_page(integer, integer, integer, text[], integer);
drop function if exists feed_page(integer, integer, integer, text[], integer, bigint, text[], numeric, numeric, integer);

create or replace function feed_page(
  p_offset           integer,
  p_limit            integer,
  p_per_brand        integer  default 10,
  p_offer_types      text[]   default null,
  p_min_age_days     integer  default 0,
  p_seed             bigint   default 0,
  p_preferred_niches text[]   default null,
  p_niche_weight     numeric  default 8,
  p_jitter_amp       numeric  default 12,
  p_discovery_every  integer  default 10
)
returns setof jsonb
language sql
stable
as $$
  with base as (
    select
      a as rec, b, p,
      (p.niche is not null and p_preferred_niches is not null and p.niche::text = any(p_preferred_niches)) as is_pref,
      a.heat_score
        + case when (p.niche is not null and p_preferred_niches is not null and p.niche::text = any(p_preferred_niches))
               then p_niche_weight else 0 end
        -- deterministyczny jitter [0, jitter_amp) z (seed, ad.id) — stabilny per sesja
        + p_jitter_amp * ((hashtextextended(a.id::text, p_seed) & 1073741823)::numeric / 1073741823.0)
        as weighted
    from ads a
    left join brands   b on b.id = a.brand_id
    left join products p on p.id = a.product_id
    where a.is_active
      and (current_date - a.start_date) >= p_min_age_days
      and (p_offer_types is null or a.offer_type::text = any(p_offer_types))
  ),
  capped as ( -- limit p_per_brand reklam/markę (top po weighted)
    select *, row_number() over (partition by (rec).brand_id order by weighted desc, (rec).id) as rn
    from base
  ),
  kept as ( select * from capped where rn <= p_per_brand ),
  seqd as ( -- przeplatanie marek (rn) + weighted
    select *, row_number() over (order by rn, weighted desc, (rec).id) as seq from kept
  ),
  pref as ( select *, row_number() over (order by seq) as r from seqd where is_pref ),
  disc as ( select *, row_number() over (order by seq) as r from seqd where not is_pref ),
  positioned as (
    -- preferowane omijają sloty odkrycia; odkrycie ląduje co p_discovery_every
    select (rec).id as id, rec, b, p,
           (r + floor((r - 1) / greatest(1, p_discovery_every - 1)))::bigint as pos
    from pref
    union all
    select (rec).id as id, rec, b, p, (r * greatest(2, p_discovery_every))::bigint as pos
    from disc
  )
  select to_jsonb(rec) || jsonb_build_object('brand', to_jsonb(b), 'product', to_jsonb(p))
  from positioned
  order by pos, id
  offset p_offset
  limit p_limit
$$;

grant execute on function feed_page(integer, integer, integer, text[], integer, bigint, text[], numeric, numeric, integer)
  to anon, authenticated, service_role;
