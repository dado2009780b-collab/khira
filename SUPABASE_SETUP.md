# Supabase setup

The API uses Supabase PostgreSQL through Drizzle. Book cover image bytes are stored in the book rows in PostgreSQL; no Supabase Storage bucket is required. The browser never receives the Supabase secret key.

## Create the project

1. Create a Supabase project and save its database password somewhere private.
2. In Project Settings → Database → Connect, copy the PostgreSQL connection string and keep `sslmode=require` if it appears in the copied string. For the deployed Cloudflare Worker, use Supabase's **Transaction pooler** connection (port `6543`), which is intended for serverless applications. For local development, the **Session pooler** (port `5432`) also works. Use the exact host and username Supabase shows for your project.
3. Copy `.env.example` to `.env` and replace the placeholder values. Never commit `.env` or share its database password.
4. Create the schema either by running the prepared SQL once in Supabase SQL Editor, or by running `pnpm --filter @workspace/db run push`. Do not use both methods on a partially created schema. The API reads `DATABASE_URL` from the root `.env` file and connects to that Supabase database.
5. Start the API with `pnpm --filter @workspace/api-server run dev`, then start the website in a second terminal with `pnpm --filter @workspace/islamic-book-bundle run dev`. Place a test order, verify it appears in the admin dashboard and Customers section, then upload and display a book cover.

## Current data model

- `book_bundle_customers` stores one customer profile per normalized phone number.
- `book_bundle_orders` stores each order and its customer link, plus a snapshot of the name, phone, city, price, and product as submitted at order time.
- Order status history, offer settings, book content, and administrator credentials remain separate tables. A book's cover image bytes and content type are stored in its book row.

The order's `customer_id` is nullable to allow a schema update when an existing database already contains orders without customer records. New orders always create or update the customer profile and link the order in one transaction.

## Book cover images

The API accepts JPEG, PNG, and WebP images up to 5 MiB, validates the actual file header, and stores the bytes and content type in `book_bundle_books`. Public cover requests are served by the API from PostgreSQL. No Storage bucket or storage secret is needed.
