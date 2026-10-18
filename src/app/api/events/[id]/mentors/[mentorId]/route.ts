import { NextRequest, NextResponse } from 'next/server';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';

function unauthorized() {
  return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
}

/** Remove a mentor (slots + bookings cascade). Organizer only. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; mentorId: string } }
) {
  const org = await requireOrganizerFromRequest(_req);
  if (!org) return unauthorized();
  const event = await getOwnedEvent(params.id, org.id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  await migrate();
  const db = getDb();
  const mentor = (await db
    .prepare('SELECT id FROM mentors WHERE id = ? AND event_id = ?')
    .get(params.mentorId, params.id)) as { id: string } | undefined;
  if (!mentor) return NextResponse.json({ error: 'Mentor not found' }, { status: 404 });

  await db.batch([
    {
      sql: 'DELETE FROM mentor_bookings WHERE slot_id IN (SELECT id FROM mentor_slots WHERE mentor_id = ?)',
      args: [params.mentorId],
    },
    { sql: 'DELETE FROM mentor_slots WHERE mentor_id = ?', args: [params.mentorId] },
    { sql: 'DELETE FROM mentors WHERE id = ?', args: [params.mentorId] },
  ]);
  return NextResponse.json({ ok: true });
}
