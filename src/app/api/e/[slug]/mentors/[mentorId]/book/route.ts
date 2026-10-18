import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getDb, migrate } from '@/lib/db';

/**
 * PUBLIC slot booking for an event.
 * Body: { slot_id, team_code } — team_code is the team's checkin_code.
 * Resolves team_id server-side. Returns 409 "Slot already booked" on a race.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string; mentorId: string } }
) {
  await migrate();
  const db = getDb();
  const event = (await db
    .prepare("SELECT id, name, status FROM events WHERE slug = ?")
    .get(params.slug)) as
    | { id: string; name: string; status: string }
    | undefined;

  if (!event || (event.status !== 'published' && event.status !== 'closed'))
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (event.status === 'closed')
    return NextResponse.json({ error: 'This hackathon has ended — booking is closed.' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const slot_id = String(body.slot_id ?? '').trim();
  const team_code = String(body.team_code ?? '').trim();
  if (!slot_id) return NextResponse.json({ error: 'slot_id is required' }, { status: 400 });
  if (!team_code)
    return NextResponse.json({ error: 'Your team code is required' }, { status: 400 });

  // Slot must belong to a mentor of this event.
  const slot = (await db
    .prepare(
      `SELECT s.id, s.is_booked, s.start_time, m.name AS mentor_name
       FROM mentor_slots s
       JOIN mentors m ON m.id = s.mentor_id
       WHERE s.id = ? AND m.id = ? AND m.event_id = ?`
    )
    .get(slot_id, params.mentorId, event.id)) as
    | { id: string; is_booked: number; start_time: string; mentor_name: string }
    | undefined;
  if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 });

  // Resolve the team from its checkin code (same case-insensitive rule as pass auth).
  const team = (await db
    .prepare(
      "SELECT id, name FROM teams WHERE event_id = ? AND upper(checkin_code) = ? AND approval_status = 'approved'"
    )
    .get(event.id, team_code.toUpperCase())) as { id: string; name: string } | undefined;
  if (!team)
    return NextResponse.json(
      { error: 'Team code not recognized for this event. Check your pass code.' },
      { status: 400 }
    );

  // Cheap pre-check for a friendly message; the UNIQUE(slot_id) constraint below
  // is the real guard against double-booking.
  if (Number(slot.is_booked) === 1 || (await db.prepare('SELECT id FROM mentor_bookings WHERE slot_id = ?').get(slot_id))) {
    return NextResponse.json({ error: 'Slot already booked' }, { status: 409 });
  }

  const bookingId = randomUUID();
  const now = new Date().toISOString();
  try {
    await db.batch([
      {
        sql: 'INSERT INTO mentor_bookings (id, slot_id, team_id, booked_at) VALUES (?, ?, ?, ?)',
        args: [bookingId, slot_id, team.id, now],
      },
      { sql: 'UPDATE mentor_slots SET is_booked = 1 WHERE id = ?', args: [slot_id] },
    ]);
  } catch (e) {
    // Lost the race: the UNIQUE(slot_id) constraint fired.
    if (/unique/i.test(String((e as Error)?.message ?? e))) {
      return NextResponse.json({ error: 'Slot already booked' }, { status: 409 });
    }
    throw e;
  }

  return NextResponse.json(
    {
      booking: {
        id: bookingId,
        slot_id,
        team_name: team.name,
        mentor_name: slot.mentor_name,
        start_time: slot.start_time,
        booked_at: now,
      },
    },
    { status: 201 }
  );
}
