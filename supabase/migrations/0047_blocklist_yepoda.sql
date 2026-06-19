-- 0047_blocklist_yepoda — + Yepoda (skincare, przeciekał przez niche=other). Tylko lista.
create or replace function public.is_blocked_brand(p_brand text)
returns boolean language sql immutable set search_path = public as $BODY$
  select public.norm_brand(p_brand) = any (array['evelinecosmetics','eveline','yourkaya','nutridome','nutridom','bielenda','ziaja','tolpa','drirenaeris','lirene','soraya','floslek','semilac','nacomi','pharmaceris','iwostin','oceanicaa','bandi','vichy','larocheposay','cerave','nivea','garnier','loreal','maybelline','neutrogena','cetaphil','eucerin','bioderma','avene','theordinary','paulaschoice','cosrx','beautyofjoseon','anua','somebymi','medicube','mixsoon','innisfree','laneige','cocosolis','drmelaxin','sacheu','rarebeauty','elf','nyx','fenty','notino','sephora','douglas','hebe','rossmann','christianlaurent','yepoda']) and length(public.norm_brand(p_brand)) > 0;
$BODY$;
