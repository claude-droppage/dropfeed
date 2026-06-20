-- ════════════════════════════════════════════════════════════════════════
-- 0050_featured_winners — trwałe oznaczanie produktów pokazanych jako dzienny
-- winner (Część 1). products.featured_at = znacznik „już był propozycją dnia".
-- Cel: raz pokazany produkt NIGDY nie wraca do dziennych propozycji.
--
-- Semantyka DATOWA (idempotencja snapshotu): selekcja wyklucza produkty
-- featured w POPRZEDNICH dniach (featured_at::date < current_date), więc
-- ponowny snapshot tego samego dnia zwraca ten sam zestaw (nie przeskakuje).
--
-- Backfill: wszystkie produkty obecne w products_daily_winners (jedyny realny
-- zapis „już pokazane"). pdw jest czyszczone >8 dni — starszych nie ma, ale
-- model selekcji (0051) sortuje od najnowszego ingestu, więc nie wrócą.
-- ════════════════════════════════════════════════════════════════════════

alter table public.products add column if not exists featured_at timestamptz;

create index if not exists products_featured_at_idx on public.products (featured_at);

-- backfill: featured_at = pierwszy dzień, w którym produkt był dziennym winnerem
update public.products p
set featured_at = sub.d::timestamptz
from (select product_id, min(day) as d from public.products_daily_winners group by product_id) sub
where p.id = sub.product_id and p.featured_at is null;
