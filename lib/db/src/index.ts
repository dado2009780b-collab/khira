import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Supabase requires TLS, but its pooler certificate chain is not trusted by
// every Node/Workers runtime. Require an encrypted connection using libpq
// semantics; this matches Supabase's sslmode=require guidance. Do not also pass
// `ssl: true` here: pg v8's current default verifies the chain and rejects the
// Supabase pooler certificate in runtimes without its root CA.
const connectionUrl = new URL(databaseUrl);
if (!connectionUrl.searchParams.has("sslmode")) {
  connectionUrl.searchParams.set("sslmode", "require");
}
// pg v8.23 treats sslmode=require as certificate verification unless its
// libpq-compatible mode is enabled. Set that compatibility only for `require`;
// preserve the stronger verification modes when an operator chose them.
if (
  connectionUrl.searchParams.get("sslmode") === "require" &&
  !connectionUrl.searchParams.has("uselibpqcompat")
) {
  connectionUrl.searchParams.set("uselibpqcompat", "true");
}

// Keep one connection per warm Worker isolate; Supabase's pooler shares the
// underlying database connections across isolates.
export const pool = new Pool({
  connectionString: connectionUrl.toString(),
  max: 1,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
