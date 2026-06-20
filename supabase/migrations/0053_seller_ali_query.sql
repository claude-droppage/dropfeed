-- ════════════════════════════════════════════════════════════════════════
-- 0053_seller_ali_query — keyword do linku „Szukaj na AliExpress" dla sprzedawcy.
-- Źródło: tytuł top-produktu ze sklepu Shopify (/products.json, publiczny, $0).
-- To LINK WYSZUKIWANIA (nie ten sam produkt 1:1) — działa dla gadżetów dropship.
-- ════════════════════════════════════════════════════════════════════════
alter table public.tiktok_organic_sellers add column if not exists ali_query text;
