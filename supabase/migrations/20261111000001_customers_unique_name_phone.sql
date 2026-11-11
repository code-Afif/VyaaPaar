create unique index if not exists uq_customers_merchant_name_phone on public.customers (merchant_id, lower(btrim(name)), (right(regexp_replace(coalesce(phone,''),'\D','','g'),10)));

