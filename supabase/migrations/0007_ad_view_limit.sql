-- ════════════════════════════════════════════════════════════════════════
-- 0007_ad_view_limit — dzienny limit oglądanych reklam (Etap 3 C5)
-- Freemium: 20 reklam/dzień dla planu 'free', bez limitu dla 'pro'.
-- Liczenie idempotentne per reklama per dzień (powrót do obejrzanej karty
-- NIE zużywa limitu). Egzekwowanie + paywall + /pro = C6.
-- Reset: kalendarzowy dzień (viewed_on = current_date), spójnie z
-- users.swipes_reset_on. Idempotentna (bezpieczna do ponownego wklejenia).
-- ════════════════════════════════════════════════════════════════════════

-- intencja zakupu Pro (przycisk „Powiadom mnie" na /pro w C6)
alter table public.users add column if not exists pro_interest_at timestamptz;

-- ─── tabela widoków: jeden wiersz na (user, reklama, dzień) ───────────────
create table if not exists public.ad_views (
  user_id    uuid not null references public.users (id) on delete cascade,
  ad_id      uuid not null references public.ads (id) on delete cascade,
  viewed_on  date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (user_id, ad_id, viewed_on)
);
create index if not exists ad_views_user_day_idx on public.ad_views (user_id, viewed_on);

alter table public.ad_views enable row level security;
-- user widzi własne; ZAPISU brak (tylko SECURITY DEFINER RPC) → nie da się
-- obejść limitu (ani dopisać, ani skasować wierszy, by zresetować licznik)
drop policy if exists ad_views_select on public.ad_views;
create policy ad_views_select on public.ad_views for select using (auth.uid() = user_id);

-- ─── consume: policz/zużyj widok reklamy; zwróć stan limitu ───────────────
-- allowed=false ⇒ feed pokaże kartę zablokowaną (C6). unlimited=true dla Pro.
create or replace function public.consume_ad_view(p_ad_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_limit constant int := 20;
  v_plan  plan_type;
  v_used  int;
  v_seen  boolean;
begin
  if v_uid is null then
    return jsonb_build_object('allowed', false, 'used', 0, 'remaining', 0, 'limit', v_limit, 'unlimited', false);
  end if;

  select plan into v_plan from public.users where id = v_uid;

  if v_plan = 'pro' then
    insert into public.ad_views (user_id, ad_id) values (v_uid, p_ad_id)
      on conflict (user_id, ad_id, viewed_on) do nothing;
    return jsonb_build_object('allowed', true, 'unlimited', true, 'limit', null);
  end if;

  -- powrót do już obejrzanej dziś karty nie zużywa limitu
  select exists(
    select 1 from public.ad_views
     where user_id = v_uid and ad_id = p_ad_id and viewed_on = current_date
  ) into v_seen;

  select count(*) into v_used from public.ad_views
   where user_id = v_uid and viewed_on = current_date;

  if v_seen then
    return jsonb_build_object('allowed', true, 'used', v_used, 'remaining', greatest(v_limit - v_used, 0), 'limit', v_limit, 'unlimited', false);
  end if;

  if v_used >= v_limit then
    return jsonb_build_object('allowed', false, 'used', v_used, 'remaining', 0, 'limit', v_limit, 'unlimited', false);
  end if;

  insert into public.ad_views (user_id, ad_id) values (v_uid, p_ad_id)
    on conflict (user_id, ad_id, viewed_on) do nothing;
  v_used := v_used + 1;
  return jsonb_build_object('allowed', true, 'used', v_used, 'remaining', greatest(v_limit - v_used, 0), 'limit', v_limit, 'unlimited', false);
end $$;

-- ─── status: odczyt licznika bez zużycia (licznik w profilu / gating C6) ──
create or replace function public.ad_view_status()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_limit constant int := 20;
  v_plan  plan_type;
  v_used  int;
begin
  if v_uid is null then
    return jsonb_build_object('used', 0, 'remaining', v_limit, 'limit', v_limit, 'unlimited', false);
  end if;
  select plan into v_plan from public.users where id = v_uid;
  if v_plan = 'pro' then
    return jsonb_build_object('unlimited', true, 'limit', null);
  end if;
  select count(*) into v_used from public.ad_views
   where user_id = v_uid and viewed_on = current_date;
  return jsonb_build_object('used', v_used, 'remaining', greatest(v_limit - v_used, 0), 'limit', v_limit, 'unlimited', false);
end $$;

-- ─── intencja Pro ─────────────────────────────────────────────────────────
create or replace function public.mark_pro_interest()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.users set pro_interest_at = coalesce(pro_interest_at, now())
   where id = auth.uid();
end $$;

-- ─── grants: tylko zalogowani; anon/public bez dostępu ────────────────────
revoke all on function public.consume_ad_view(uuid) from public, anon;
revoke all on function public.ad_view_status()      from public, anon;
revoke all on function public.mark_pro_interest()   from public, anon;
grant execute on function public.consume_ad_view(uuid) to authenticated;
grant execute on function public.ad_view_status()      to authenticated;
grant execute on function public.mark_pro_interest()   to authenticated;
