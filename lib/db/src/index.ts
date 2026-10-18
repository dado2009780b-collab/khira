import { AsyncLocalStorage } from "node:async_hooks";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

function createDatabaseContext(
  databaseUrl = process.env.DATABASE_URL,
  useConnectionStringAsIs = false,
) {
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  // Supabase requires TLS. Require an encrypted connection using libpq
  // semantics; this matches Supabase's sslmode=require guidance. Do not also
  // pass `ssl: true` here: pg v8's current default verifies the chain and can
  // reject the Supabase pooler certificate in runtimes without its root CA.
  let connectionString = databaseUrl;
  if (!useConnectionStringAsIs) {
    const connectionUrl = new URL(databaseUrl);
    if (!connectionUrl.searchParams.has("sslmode")) {
      connectionUrl.searchParams.set("sslmode", "require");
    }
    // pg v8.23 treats sslmode=require as certificate verification unless its
    // libpq-compatible mode is enabled. Set it only for `require`; preserve the
    // stronger verification modes when an operator chose them.
    if (
      connectionUrl.searchParams.get("sslmode") === "require" &&
      !connectionUrl.searchParams.has("uselibpqcompat")
    ) {
      connectionUrl.searchParams.set("uselibpqcompat", "true");
    }
    connectionString = connectionUrl.toString();
  }

  const pool = new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });

  // Catch idle client errors so they do not crash the Node or Worker process
  pool.on("error", (err) => {
    console.warn("Unexpected error on idle database client", err);
  });

  return { pool, db: drizzle(pool, { schema }) };
}

type DatabaseContext = ReturnType<typeof createDatabaseContext>;

const requestDatabaseContext = new AsyncLocalStorage<DatabaseContext>();
let localDatabaseContext: DatabaseContext | undefined;

function getDatabaseContext(): DatabaseContext {
  const requestContext = requestDatabaseContext.getStore();
  if (requestContext) return requestContext;

  // The persistent Node server used during local development keeps its normal
  // process-wide pool. Cloudflare Workers instead use withRequestDatabase().
  localDatabaseContext ??= createDatabaseContext();
  return localDatabaseContext;
}

/** Create a fresh database pool for one Cloudflare Worker request. */
export async function withRequestDatabase<T>(
  operation: () => Promise<T>,
  options: {
    connectionString?: string;
    useConnectionStringAsIs?: boolean;
  } = {},
): Promise<T> {
  const requestContext = createDatabaseContext(
    options.connectionString,
    options.useConnectionStringAsIs,
  );

  return requestDatabaseContext.run(requestContext, async () => {
    try {
      return await operation();
    } finally {
      await requestContext.pool.end();
    }
  });
}

// Database access stays compatible with existing route imports while each
// Worker invocation receives its own pool through AsyncLocalStorage.
export const pool = new Proxy({} as DatabaseContext["pool"], {
  get(_target, property) {
    const requestPool = getDatabaseContext().pool;
    const value = Reflect.get(requestPool, property, requestPool);
    return typeof value === "function" ? value.bind(requestPool) : value;
  },
}) as DatabaseContext["pool"];

export const db = new Proxy({} as DatabaseContext["db"], {
  get(_target, property) {
    const requestDb = getDatabaseContext().db;
    const value = Reflect.get(requestDb, property, requestDb);
    return typeof value === "function" ? value.bind(requestDb) : value;
  },
}) as DatabaseContext["db"];

export * from "./schema";
