import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';

function unauthorized() {
  return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
}

const CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomCode(): string {
  let suffix = '';
  for (let i = 0; i < 5; i++) {
    suffix += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `JUDGE-${suffix}`;
}

/** Generate a globally-unique access code, retrying on collision. */
async function uniqueAccessCode(): Promise<string> {
  const db = getDb();
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    const existing = await db.prepare('SELECT id FROM judges WHERE access_code = ?').get(code);
    if (!existing) return code;
  }
  throw new Error('Could not generate a unique access code');
}

/** List judges for an event (organizer-owned; codes visible to organizer only). */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const org = await requireOrganizerFromRequest(_req);
  if (!org) return unauthorized();
  const event = await getOwnedEvent(params.id, org.id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const judges = await getDb()
    .prepare('SELECT id, event_id, name, email, access_code, created_at FROM judges WHERE event_id = ? ORDER BY created_at')
    .all(params.id);
  return NextResponse.json({ judges });
}

/**
 * Create a judge for an event. Body: { name, email? }
 * Auto-generates a unique access code (JUDGE-XXXXX). Returns the judge incl. code.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const org = await requireOrganizerFromRequest(req);
  if (!org) return unauthorized();
  const event = await getOwnedEvent(params.id, org.id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  await migrate();
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim();

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const id = randomUUID();
  const accessCode = await uniqueAccessCode();
  const now = new Date().toISOString();

  await getDb()
    .prepare('INSERT INTO judges (id, event_id, name, email, access_code, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, params.id, name, email, accessCode, now);

  const judge = await getDb()
    .prepare('SELECT id, event_id, name, email, access_code, created_at FROM judges WHERE id = ?')
    .get(id);
  return NextResponse.json({ judge }, { status: 201 });
}
