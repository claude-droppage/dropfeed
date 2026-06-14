-- ════════════════════════════════════════════════════════════════════════
-- Backfill FAZA A — platforms + variants_count z raw_ads.payload (bez scrapa)
-- Idempotentny (ustawia te same wartości przy ponownym uruchomieniu).
-- ════════════════════════════════════════════════════════════════════════
update ads a set
  platforms = coalesce(
    (select array_agg(x) from jsonb_array_elements_text(rw.payload->'publisher_platform') x),
    '{}'
  ),
  variants_count = nullif(rw.payload->>'collation_count', '')::int
from raw_ads rw
where rw.ad_archive_id = a.ad_archive_id;
