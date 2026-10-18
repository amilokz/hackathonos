import { NextRequest, NextResponse } from 'next/server';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';

function unauthorized() {
  return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
}

/**
 * Cancel a booking (organizer). Frees the slot so a team can book it again.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; mentorId: string; bookingId: string } }
) {
  const org = await requireOrganizerFromRequest(_req);
  if (!org) return unauthorized();
  const event = await getOwnedEvent(params.id, org.id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  await migrate();
  const db = getDb();
  const booking = (await db
    .prepare(
      `SELECT b.id, b.slot_id
       FROM mentor_bookings b
       JOIN mentor_slots s ON s.id = b.slot_id
       WHERE b.id = ? AND s.mentor_id = ?`
    )
    .get(params.bookingId, params.mentorId)) as { id: string; slot_id: string } | undefined;
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

  await db.batch([
    { sql: 'DELETE FROM mentor_bookings WHERE id = ?', args: [params.bookingId] },
    { sql: 'UPDATE mentor_slots SET is_booked = 0 WHERE id = ?', args: [booking.slot_id] },
  ]);
  return NextResponse.json({ ok: true });
}
