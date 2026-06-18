-- ════════════════════════════════════════════════════════════════════════
-- 0031_exclusions_selftan_spf — rozszerzenie wykluczeń (Część 2).
-- Przeciekały self-tan / SPF. Dodaję precyzyjnie (EN+PL): self-tan / self tanning /
-- samoopalacz / samoopalając* / bronzer / SPF / sunscreen / sunblock /
-- przeciwsłoneczn* / after-sun. NIE łapię ogólników „spray"/„ochronny" samych w sobie
-- (`\mspf` z granicą słowa; reszta dystynktywna). Mirror JS = EXCL_RE.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.is_excluded_title(t text)
returns boolean language sql immutable set search_path = public as $$
  select lower(coalesce(t, '')) ~* (
    '\m(cream|serum|ointment|balm|lotion|supplement|vitamin|collagen|capsule|gummies|gummy|skincare|krem|maść|masc|balsam|suplement|witamin|kolagen|bronzer|sunscreen|sunblock)'
    || '|face ?mask|self[ -]?tan|samoopalacz|samoopalaj|przeciws[lł]oneczn|after[ -]?sun|\mspf'
  )
$$;

-- spójność: przelicz flagę excluded TikToka tą definicją
update public.tiktok_shop_products set excluded = public.is_excluded_title(title)
where excluded is distinct from public.is_excluded_title(title);
