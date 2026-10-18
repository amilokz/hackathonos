import { NextResponse } from 'next/server';
import { getDb, migrate } from '@/lib/db';

// TEMPORARY debug endpoint — remove after diagnosing the LiveNow issue.
export async function GET() {
  await migrate();
  const db = getDb();
  const dbKind = process.env.TURSO_DATABASE_URL
    ? 'turso'
    : process.env.DATABASE_URL
      ? 'database_url'
      : 'local-file';
  const events = (await db
    .prepare('SELECT id, name, slug, status, created_at FROM events ORDER BY created_at DESC')
    .all()) as Array<{ id: string; name: string; slug: string; status: string; created_at: string }>;
  // Exact homepage LiveNow query:
  let liveNow: unknown[] = [];
  let liveNowError: string | null = null;
  try {
    liveNow = (await db
      .prepare(
        `SELECT e.id, e.name, e.slug, e.cover_url, e.description, e.start_date, e.end_date,
                (SELECT COUNT(*) FROM teams t WHERE t.event_id = e.id) AS team_count
         FROM events e WHERE e.status = 'published'
         ORDER BY e.start_date ASC, e.created_at DESC`
      )
      .all()) as unknown[];
  } catch (e) {
    liveNowError = e instanceof Error ? e.message : String(e);
  }
  return NextResponse.json({
    dbKind,
    eventCount: events.length,
    events: events.map((e) => ({ name: e.name, slug: e.slug, status: e.status })),
    liveNowCount: liveNow.length,
    liveNowNames: (liveNow as Array<{ name: string }>).map((e) => e.name),
    liveNowError,
  });
}
