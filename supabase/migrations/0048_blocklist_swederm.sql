-- 0048_blocklist_swederm — + Swederm (skincare, niche=other) do brand-blocklisty;
-- Babski Świat → is_nonproduct (treść social, nie produkt). BEZ reguły 'other=podejrzane'.
create or replace function public.is_blocked_brand(p_brand text)
returns boolean language sql immutable set search_path = public as $BODY$
  select public.norm_brand(p_brand) = any (array['evelinecosmetics','eveline','yourkaya','nutridome','nutridom','bielenda','ziaja','tolpa','drirenaeris','lirene','soraya','floslek','semilac','nacomi','pharmaceris','iwostin','oceanicaa','bandi','vichy','larocheposay','cerave','nivea','garnier','loreal','maybelline','neutrogena','cetaphil','eucerin','bioderma','avene','theordinary','paulaschoice','cosrx','beautyofjoseon','anua','somebymi','medicube','mixsoon','innisfree','laneige','cocosolis','drmelaxin','sacheu','rarebeauty','elf','nyx','fenty','notino','sephora','douglas','hebe','rossmann','christianlaurent','yepoda','swederm']) and length(public.norm_brand(p_brand)) > 0;
$BODY$;

create or replace function public.is_nonproduct(p_name text, p_offer_url text)
returns boolean language sql immutable set search_path = public as $BODY$
  select
    lower(coalesce(p_name, '')) ~* (
      '\m(alibaba|aliexpress|dhgate|temu|wish)\M|\m(marketplace|b2b)\M'
      || '|prime day|black friday|cyber monday|download (the )?app|\mapp ?store\M|google play|sklep play'
      || '|babski ?[śs]wiat'
    )
    or coalesce(p_offer_url, '') ~* '^https?://[^/]*(alibaba|aliexpress|dhgate|temu)\.|apps\.apple\.com|play\.google\.com';
$BODY$;
