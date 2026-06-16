-- ════════════════════════════════════════════════════════════════════════
-- 0006_onboarding — onboarding na koncie (Etap 3 C4)
-- Przenosi stan onboardingu z localStorage na konto użytkownika.
-- onboarded: czy user przeszedł onboarding (gate decyduje, czy pokazać /onboarding)
-- intent: IntentKey z onboardingu (physical|digital|inspirations|any) → feedMode+offerTypes
-- selected_niches (już istnieje, niche_type[]): rozwiązane nisze do ważenia feedu
-- Idempotentna (bezpieczna do ponownego wklejenia).
-- ════════════════════════════════════════════════════════════════════════

alter table public.users add column if not exists onboarded boolean not null default false;
alter table public.users add column if not exists intent text;

-- RPC: zapis onboardingu dla zalogowanego usera (server-side, nie da się podmienić cudzego konta)
create or replace function public.set_onboarding(p_intent text, p_niches niche_type[])
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.users
     set intent          = p_intent,
         selected_niches = coalesce(p_niches, '{}'::niche_type[]),
         onboarded        = true
   where id = auth.uid();
end $$;

revoke all on function public.set_onboarding(text, niche_type[]) from public, anon;
grant execute on function public.set_onboarding(text, niche_type[]) to authenticated;
