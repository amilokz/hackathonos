import { NextRequest, NextResponse } from 'next/server';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest } from '@/lib/require-organizer';

function genCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `ORG-${s}`;
}

// GET: list my invite codes. POST: generate a new one. (organizer only)
export async function GET(req: NextRequest) {
  const auth = await requireOrganizerFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  await migrate();
  const db = getDb();
  const codes = (await db
    .prepare(
      'SELECT code, used_by, created_at, used_at FROM organizer_invites WHERE created_by = ? ORDER BY created_at DESC'
    )
    .all(auth.organizerId)) as Array<{
    code: string;
    used_by: string | null;
    created_at: string;
    used_at: string | null;
  }>;
  return NextResponse.json({ codes });
}

export async function POST(req: NextRequest) {
  const auth = await requireOrganizerFromRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  await migrate();
  const db = getDb();
  const code = genCode();
  const now = new Date().toISOString();
  await db
    .prepare('INSERT INTO organizer_invites (code, created_by, created_at) VALUES (?, ?, ?)')
    .run(code, auth.organizerId, now);
  return NextResponse.json({ code }, { status: 201 });
}
