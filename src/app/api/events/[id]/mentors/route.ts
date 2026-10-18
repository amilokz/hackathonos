import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getDb, migrate } from '@/lib/db';
import { loadMentors } from '@/lib/mentors';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';

function unauthorized() {
  return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
}

/** List mentors for an event, with slots + bookings (team names). Organizer only. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const org = await requireOrganizerFromRequest(_req);
  if (!org) return unauthorized();
  const event = await getOwnedEvent(params.id, org.id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  await migrate();
  const mentors = await loadMentors(params.id);
  return NextResponse.json({ mentors });
}

/**
 * Create a mentor. Body: { name, expertise?, bio? }
 * expertise is a comma-separated tag string.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const org = await requireOrganizerFromRequest(req);
  if (!org) return unauthorized();
  const event = await getOwnedEvent(params.id, org.id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  await migrate();
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? '').trim();
  const expertise = String(body.expertise ?? '').trim();
  const bio = String(body.bio ?? '').trim();

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const id = randomUUID();
  const now = new Date().toISOString();
  await getDb()
    .prepare(
      'INSERT INTO mentors (id, event_id, name, expertise, bio, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(id, params.id, name, expertise, bio, now);

  return NextResponse.json(
    { mentor: { id, event_id: params.id, name, expertise, bio, created_at: now, slots: [] } },
    { status: 201 }
  );
}
