-- Upgrade databases created from the earlier schema that stored customer
-- details only on each order. Existing orders remain valid and unlinked until
-- a customer places another order.

CREATE TABLE IF NOT EXISTS public.book_bundle_customers (
  id serial PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL,
  city text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS book_bundle_customers_phone_unique
  ON public.book_bundle_customers (phone);
CREATE INDEX IF NOT EXISTS book_bundle_customers_name_idx
  ON public.book_bundle_customers (name);
CREATE INDEX IF NOT EXISTS book_bundle_customers_city_idx
  ON public.book_bundle_customers (city);

ALTER TABLE public.book_bundle_orders
  ADD COLUMN IF NOT EXISTS customer_id integer;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'book_bundle_orders_customer_id_book_bundle_customers_id_fk'
      AND conrelid = 'public.book_bundle_orders'::regclass
  ) THEN
    ALTER TABLE public.book_bundle_orders
      ADD CONSTRAINT book_bundle_orders_customer_id_book_bundle_customers_id_fk
      FOREIGN KEY (customer_id)
      REFERENCES public.book_bundle_customers(id)
      ON DELETE SET NULL;
  END IF;
END $$;
