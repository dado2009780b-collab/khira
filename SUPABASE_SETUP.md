# Supabase setup

The API uses Supabase PostgreSQL through Drizzle. On Cloudflare Pages, the API runs through a Pages Function and connects through a Cloudflare Hyperdrive binding named `HYPERDRIVE`; Hyperdrive manages the database connection pool. For local development, the API reads `DATABASE_URL` from `.env`. Book cover image bytes are stored in the book rows in PostgreSQL; no Supabase Storage bucket is required. The browser never receives the Supabase secret key.

## Create the project

1. Create a Supabase project and save its database password somewhere private.
2. In Project Settings → Database → Connect, copy the **Direct connection** string for Cloudflare Hyperdrive. Hyperdrive provides its own pooling, so do not point it at Supabase's transaction pooler. For local development, the **Session pooler** (port `5432`) also works. Use the exact host and username Supabase shows for your project.
3. In Cloudflare, create a Hyperdrive configuration using the Supabase direct connection string. Keep the password private. In the Pages project, add the generated configuration as a binding called `HYPERDRIVE`.

   The ID is not a password; the database password remains stored in the Hyperdrive configuration.

4. Add `ADMIN_PASSWORD` and `SESSION_SECRET` as encrypted Secrets in the Pages Production environment. Add the Telegram values there too if notifications are enabled. Copy `.env.example` to `.env` and replace the placeholder values for local development. Never commit `.env` or share its database password. The production Pages Function uses the Hyperdrive binding instead of `DATABASE_URL`.
5. Create the schema either by running the prepared SQL once in Supabase SQL Editor, or by running `pnpm --filter @workspace/db run push`. Do not use both methods on a partially created schema.
6. Run `pnpm dev` from the project folder. It starts the API and website together. Place a test order, verify it appears in the admin dashboard and Customers section, then upload and display a book cover.

## Current data model

- `book_bundle_customers` stores one customer profile per normalized phone number.
- `book_bundle_orders` stores each order and its customer link, plus a snapshot of the name, phone, city, price, and product as submitted at order time.
- Order status history, offer settings, book content, and administrator credentials remain separate tables. A book's cover image bytes and content type are stored in its book row.

The order's `customer_id` is nullable to allow a schema update when an existing database already contains orders without customer records. New orders always create or update the customer profile and link the order in one transaction.

## Book cover images

The API accepts JPEG, PNG, and WebP images up to 5 MiB, validates the actual file header, and stores the bytes and content type in `book_bundle_books`. Public cover requests are served by the API from PostgreSQL. No Storage bucket or storage secret is needed.
