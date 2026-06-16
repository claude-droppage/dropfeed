-- ════════════════════════════════════════════════════════════════════════
-- 0008_stripe — kolumny subskrypcji Stripe + zamknięcie zapisów do users (Etap 4 C1)
-- ════════════════════════════════════════════════════════════════════════

-- Kolumny subskrypcji (plan plan_type już istnieje z 0001).
alter table public.users add column if not exists stripe_customer_id     text;
alter table public.users add column if not exists stripe_subscription_id text;
alter table public.users add column if not exists subscription_status    text;

-- Webhook szuka usera po customer_id → indeks.
create index if not exists users_stripe_customer_idx on public.users (stripe_customer_id);

-- 🔒 ZAMKNIĘCIE DZIURY: zapisy do users TYLKO przez SECURITY DEFINER RPC
-- (set_onboarding / mark_pro_interest / consume_ad_view) oraz service_role
-- (webhook Stripe ustawiający plan). Bez tego user z anon key mógłby
-- `update users set plan='pro' where id=auth.uid()` (polityka users_update
-- pozwala na własny wiersz) i dać sobie Pro za darmo.
-- handle_new_user to SECURITY DEFINER trigger → INSERT przy rejestracji
-- działa mimo poniższego revoke (uruchamia się jako owner). SELECT zostaje.
revoke insert, update, delete, truncate on public.users from anon, authenticated;
