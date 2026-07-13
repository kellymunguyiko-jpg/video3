import { drizzle } from "drizzle-orm/node-postgres";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Lazy database initialization.
//
// The DB client is created ONLY when it is first used at runtime — never at
// module load / build time. This lets `next build` (and hosts like Netlify)
// collect page data WITHOUT requiring DATABASE_URL to be set during the build.
// VidGrab's download features don't use the DB, so the build never touches it.

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsDrizzle?: NodePgDatabase;
};

function getPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  if (!globalForDb.__arenaNextJsPostgresqlPool) {
    globalForDb.__arenaNextJsPostgresqlPool = new Pool({
      connectionString: databaseUrl,
    });
  }
  return globalForDb.__arenaNextJsPostgresqlPool;
}

function getDb(): NodePgDatabase {
  if (!globalForDb.__arenaNextJsDrizzle) {
    globalForDb.__arenaNextJsDrizzle = drizzle(getPool());
  }
  return globalForDb.__arenaNextJsDrizzle;
}

// Export a proxy so `db` behaves exactly like a Drizzle instance, but the real
// client (and the DATABASE_URL check) is only created on first property access.
export const db = new Proxy({} as NodePgDatabase, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

// Backwards-compatible lazy pool accessor.
export const pool = new Proxy({} as Pool, {
  get(_target, prop, receiver) {
    const real = getPool();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});
