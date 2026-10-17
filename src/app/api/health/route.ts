import { NextResponse } from 'next/server';
import { getDb, migrate } from '@/lib/db';

export async function GET() {
  try {
    await migrate();
    const db = getDb();
    const row = await db.prepare('SELECT 1 AS ok').get() as { ok: number };
    return NextResponse.json({ ok: row.ok === 1, db: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    );
  }
}
