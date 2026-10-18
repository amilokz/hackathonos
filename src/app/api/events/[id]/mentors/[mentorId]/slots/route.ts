import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';

function unauthorized() {
  return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
}

async function ownedMentor(eventId: string, mentorId: string) {
  return (await getDb()
    .prepare('SELECT id FROM mentors WHERE id = ? AND event_id = ?')
    .get(mentorId, eventId)) as { id: string } | undefined;
}

/**
 * Bulk-add availability slots to a mentor.
 * Body: { slots: [{ start_time, end_time }] } — ISO strings, e.g. "2026-10-25T14:00".
 * Invalid entries are skipped; returns the created slots.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; mentorId: string } }
) {
  const org = await requireOrganizerFromRequest(req);
  if (!org) return unauthorized();
  const event = await getOwnedEvent(params.id, org.id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  await migrate();
  const mentor = await ownedMentor(params.id, params.mentorId);
  if (!mentor) return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const raw = Array.isArray(body.slots) ? body.slots : [];
  const db = getDb();
  const created: Array<{ id: string; start_time: string; end_time: string }> = [];

  for (const s of raw) {
    const start_time = String(s?.start_time ?? '').trim();
    const end_time = String(s?.end_time ?? '').trim();
    if (!start_time || !end_time) continue;
    const startMs = Date.parse(start_time);
    const endMs = Date.parse(end_time);
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) continue;
    const id = randomUUID();
    await db
      .prepare(
        'INSERT INTO mentor_slots (id, mentor_id, start_time, end_time, is_booked) VALUES (?, ?, ?, ?, 0)'
      )
      .run(id, params.mentorId, start_time, end_time);
    created.push({ id, start_time, end_time });
  }

  return NextResponse.json({ slots: created }, { status: 201 });
}
