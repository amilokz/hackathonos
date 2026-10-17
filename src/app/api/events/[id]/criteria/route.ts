import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getDb } from '@/lib/db';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';

function unauthorized() {
  return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
}

/** List criteria for an event (organizer-owned). */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const org = await requireOrganizerFromRequest(_req);
  if (!org) return unauthorized();
  const event = await getOwnedEvent(params.id, org.id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const criteria = await getDb()
    .prepare('SELECT * FROM criteria WHERE event_id = ? ORDER BY rowid')
    .all(params.id);
  return NextResponse.json({ criteria });
}

/** Create a criterion for an event. Body: { name, weight, description? } */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const org = await requireOrganizerFromRequest(req);
  if (!org) return unauthorized();
  const event = await getOwnedEvent(params.id, org.id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? '').trim();
  const weight = Number(body.weight);
  const description = String(body.description ?? '').trim();

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!Number.isFinite(weight) || weight <= 0 || weight > 100) {
    return NextResponse.json({ error: 'Weight must be a number between 0 and 100' }, { status: 400 });
  }

  const id = randomUUID();
  getDb()
    .prepare('INSERT INTO criteria (id, event_id, name, weight, description) VALUES (?, ?, ?, ?, ?)')
    .run(id, params.id, name, weight, description);

  const criterion = await getDb().prepare('SELECT * FROM criteria WHERE id = ?').get(id);
  return NextResponse.json({ criterion }, { status: 201 });
}
