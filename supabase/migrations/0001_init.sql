-- ════════════════════════════════════════════════════════════════════════
-- dropfeed — schemat inicjalny (Etap 1, krok 1)
-- 9 tabel: raw_ads, brands, products, ads, users, boards, saved_items,
--          swipes, scrape_config
-- Enumy 1:1 z lib/types.ts. Bezpieczny do ponownego wklejenia (idempotentny).
-- Wklej całość w Supabase → SQL Editor → Run.
-- ════════════════════════════════════════════════════════════════════════

-- ─── EXTENSIONS ──────────────────────────────────────────────────────────
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ─── ENUMY (odwzorowanie typów z lib/types.ts) ───────────────────────────
do $$ begin
  create type offer_type as enum
    ('physical', 'digital', 'app', 'service', 'course', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ad_format as enum ('video', 'image');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ad_angle as enum
    ('ugc', 'demo', 'problem-solution', 'testimonial',
     'lifestyle', 'comparison', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type niche_type as enum
    ('beauty', 'kitchen', 'pet', 'fitness', 'gadgets', 'home',
     'fashion', 'health', 'tech', 'education', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type plan_type as enum ('free', 'pro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type swipe_direction as enum ('skip', 'save', 'deep');
exception when duplicate_object then null; end $$;

-- ─── FUNKCJA: auto-aktualizacja updated_at ───────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ════════════════════════════════════════════════════════════════════════
-- 1. raw_ads — surowe dane z Apify/TikTok przed enrichmentem (staging)
-- ════════════════════════════════════════════════════════════════════════
create table if not exists raw_ads (
  id             uuid primary key default gen_random_uuid(),
  ad_archive_id  text not null,              -- identyfikator z Meta Ad Library
  source         text not null,              -- 'meta_ad_library' | 'tiktok_creative_center'
  payload        jsonb not null,             -- pełny surowy scrape
  scraped_at     timestamptz not null default now(),
  processed      boolean not null default false, -- czy przeszło enrichment
  processed_at   timestamptz,
  created_at     timestamptz not null default now()
);
-- UNIKAT na ad_archive_id (dedup tego samego ogłoszenia między scrape'ami)
create unique index if not exists raw_ads_ad_archive_id_key on raw_ads (ad_archive_id);
create index if not exists raw_ads_processed_idx on raw_ads (processed);

-- ════════════════════════════════════════════════════════════════════════
-- 2. brands — marka / advertiser (Brand)
-- ════════════════════════════════════════════════════════════════════════
create table if not exists brands (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  fb_page_id      text,
  ig_handle       text,
  ig_followers    integer,
  store_url       text,
  country         text,                      -- ISO 3166-1 alpha-2
  avatar_initials text not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
-- fb_page_id jako naturalny klucz dedup marki (NULL dozwolony wielokrotnie)
create unique index if not exists brands_fb_page_id_key on brands (fb_page_id);
drop trigger if exists brands_set_updated_at on brands;
create trigger brands_set_updated_at before update on brands
  for each row execute function set_updated_at();

-- ════════════════════════════════════════════════════════════════════════
-- 3. products — oferta (Product)
-- ════════════════════════════════════════════════════════════════════════
create table if not exists products (
  id             uuid primary key default gen_random_uuid(),
  brand_id       uuid not null references brands (id) on delete cascade,
  name           text not null,
  offer_type     offer_type not null,
  niche          niche_type not null,
  category       text not null,
  price_in_store numeric(10, 2),
  offer_url      text,
  thumbnail      text,
  confidence     real not null default 0 check (confidence >= 0 and confidence <= 1),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists products_brand_id_idx  on products (brand_id);
create index if not exists products_niche_idx      on products (niche);
create index if not exists products_offer_type_idx on products (offer_type);
drop trigger if exists products_set_updated_at on products;
create trigger products_set_updated_at before update on products
  for each row execute function set_updated_at();

-- ════════════════════════════════════════════════════════════════════════
-- 4. ads — kreacja reklamowa (Ad)
-- ════════════════════════════════════════════════════════════════════════
create table if not exists ads (
  id                       uuid primary key default gen_random_uuid(),
  ad_archive_id            text,             -- powiązanie ze źródłem (raw_ads)
  brand_id                 uuid not null references brands (id) on delete cascade,
  product_id               uuid references products (id) on delete set null,
  format                   ad_format not null,
  creative_url             text not null,    -- URL kreacji (R2)
  thumb_url                text,             -- poster/pierwsza klatka (R2)
  angle                    ad_angle,
  hook                     text,
  copy                     text,
  cta                      text,
  start_date               date not null,
  is_active                boolean not null default true,
  countries                text[] not null default '{}', -- alpha-2
  heat_score               integer not null default 0
                             check (heat_score >= 0 and heat_score <= 100),
  ad_variants_count        integer not null default 0,
  scaling_since            integer,          -- dni skalowania; NULL = nie skaluje
  offer_type               offer_type not null,
  confidence               real not null default 0
                             check (confidence >= 0 and confidence <= 1),
  age_in_days              integer not null default 0,
  new_variants_last_14_days integer not null default 0,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
-- UNIKAT na ad_archive_id (NULL dozwolony wielokrotnie, np. TikTok bez ID)
create unique index if not exists ads_ad_archive_id_key on ads (ad_archive_id);
-- INDEKS na heat_score (sortowanie feedu "najgorętsze" — malejąco)
create index if not exists ads_heat_score_idx  on ads (heat_score desc);
-- INDEKS na offer_type (filtr kategorii oferty z onboardingu/feedu)
create index if not exists ads_offer_type_idx  on ads (offer_type);
create index if not exists ads_brand_id_idx     on ads (brand_id);
create index if not exists ads_product_id_idx   on ads (product_id);
create index if not exists ads_is_active_idx    on ads (is_active);
drop trigger if exists ads_set_updated_at on ads;
create trigger ads_set_updated_at before update on ads
  for each row execute function set_updated_at();

-- ════════════════════════════════════════════════════════════════════════
-- 5. users — profil użytkownika (User); rozszerza auth.users Supabase
-- ════════════════════════════════════════════════════════════════════════
create table if not exists users (
  id              uuid primary key references auth.users (id) on delete cascade,
  selected_niches niche_type[] not null default '{}',
  plan            plan_type not null default 'free',
  swipes_today    integer not null default 0,
  swipes_reset_on date not null default current_date, -- reset dziennego licznika
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
drop trigger if exists users_set_updated_at on users;
create trigger users_set_updated_at before update on users
  for each row execute function set_updated_at();

-- Auto-utworzenie wiersza users przy rejestracji w auth.users
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id) values (new.id) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ════════════════════════════════════════════════════════════════════════
-- 6. boards — kolekcje zapisanych pozycji (Board)
-- ════════════════════════════════════════════════════════════════════════
create table if not exists boards (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);
create index if not exists boards_user_id_idx on boards (user_id);

-- ════════════════════════════════════════════════════════════════════════
-- 7. saved_items — powiązanie board → ad/product (SavedItem)
-- ════════════════════════════════════════════════════════════════════════
create table if not exists saved_items (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references boards (id) on delete cascade,
  ad_id      uuid references ads (id) on delete cascade,
  product_id uuid references products (id) on delete cascade,
  saved_at   timestamptz not null default now(),
  -- musi wskazywać na coś
  constraint saved_items_target_chk check (ad_id is not null or product_id is not null)
);
create index if not exists saved_items_board_id_idx on saved_items (board_id);
-- bez duplikatów tej samej reklamy w jednym boardzie
create unique index if not exists saved_items_board_ad_key
  on saved_items (board_id, ad_id) where ad_id is not null;

-- ════════════════════════════════════════════════════════════════════════
-- 8. swipes — sygnał personalizacji (Swipe)
-- ════════════════════════════════════════════════════════════════════════
create table if not exists swipes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users (id) on delete cascade,
  ad_id      uuid not null references ads (id) on delete cascade,
  direction  swipe_direction not null,
  created_at timestamptz not null default now()
);
create index if not exists swipes_user_id_idx       on swipes (user_id);
create index if not exists swipes_user_created_idx   on swipes (user_id, created_at desc);

-- ════════════════════════════════════════════════════════════════════════
-- 9. scrape_config — konfiguracja zadań pozyskiwania danych (pipeline)
-- ════════════════════════════════════════════════════════════════════════
create table if not exists scrape_config (
  id          uuid primary key default gen_random_uuid(),
  source      text not null,                 -- 'meta_ad_library' | 'tiktok_creative_center'
  query       text,                          -- słowo kluczowe / fraza
  country     text,                          -- alpha-2
  niche       niche_type,
  is_active   boolean not null default true,
  max_results integer not null default 1000,
  last_run_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists scrape_config_active_idx on scrape_config (is_active);
drop trigger if exists scrape_config_set_updated_at on scrape_config;
create trigger scrape_config_set_updated_at before update on scrape_config
  for each row execute function set_updated_at();

-- ════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════════════
-- Reguła:
--  • Treść publiczna (brands, products, ads): odczyt dla wszystkich; zapis
--    tylko service_role (pipeline). RLS bez polityk write = deny dla klienta.
--  • Dane użytkownika (users, boards, saved_items, swipes): user widzi i edytuje
--    wyłącznie swoje (auth.uid()).
--  • Infrastruktura (raw_ads, scrape_config): RLS włączone, ZERO polityk →
--    dostęp tylko przez service_role (omija RLS). Klient: brak dostępu.

alter table raw_ads       enable row level security;
alter table scrape_config enable row level security;
alter table brands        enable row level security;
alter table products      enable row level security;
alter table ads           enable row level security;
alter table users         enable row level security;
alter table boards        enable row level security;
alter table saved_items   enable row level security;
alter table swipes        enable row level security;

-- ─── Treść publiczna: odczyt dla anon + authenticated ────────────────────
drop policy if exists brands_read   on brands;
create policy brands_read   on brands   for select using (true);
drop policy if exists products_read on products;
create policy products_read on products for select using (true);
drop policy if exists ads_read     on ads;
create policy ads_read      on ads      for select using (true);

-- ─── users: tylko własny wiersz ──────────────────────────────────────────
drop policy if exists users_select on users;
create policy users_select on users for select using (auth.uid() = id);
drop policy if exists users_insert on users;
create policy users_insert on users for insert with check (auth.uid() = id);
drop policy if exists users_update on users;
create policy users_update on users for update using (auth.uid() = id) with check (auth.uid() = id);

-- ─── boards: tylko własne ────────────────────────────────────────────────
drop policy if exists boards_all on boards;
create policy boards_all on boards for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── saved_items: tylko w boardach należących do usera ───────────────────
drop policy if exists saved_items_all on saved_items;
create policy saved_items_all on saved_items for all
  using (exists (select 1 from boards b where b.id = board_id and b.user_id = auth.uid()))
  with check (exists (select 1 from boards b where b.id = board_id and b.user_id = auth.uid()));

-- ─── swipes: tylko własne ────────────────────────────────────────────────
drop policy if exists swipes_all on swipes;
create policy swipes_all on swipes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- raw_ads, scrape_config: RLS włączone, brak polityk → tylko service_role.
