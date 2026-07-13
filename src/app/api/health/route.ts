import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  // If no database is configured, the app is still healthy — VidGrab's core
  // download features don't require a database.
  if (!process.env.DATABASE_URL) {
    return Response.json({ ok: true, db: false });
  }

  try {
    // Import lazily so build-time page-data collection never touches the DB.
    const { db } = await import("@/db");
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, db: true });
  } catch {
    // DB is down/misconfigured, but the app itself is up.
    return Response.json({ ok: true, db: false });
  }
}
