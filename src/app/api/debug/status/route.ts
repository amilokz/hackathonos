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
  return NextResponse.json({
    dbKind,
    tursoUrlSet: !!process.env.TURSO_DATABASE_URL,
    tursoUrlPrefix: (process.env.TURSO_DATABASE_URL || '').slice(0, 20),
    eventCount: events.length,
    events: events.map((e) => ({ name: e.name, slug: e.slug, status: e.status })),
  });
}
