import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Missing configuration must not crash the build or unrelated routes: the pool
// is lazy (pg connects on first query) so /api/health can report `ok: false`
// instead of failing page-data collection.
const databaseUrl = process.env.DATABASE_URL ?? "postgresql://unconfigured@127.0.0.1:5432/unconfigured";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
