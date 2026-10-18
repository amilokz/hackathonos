import { NextRequest, NextResponse } from 'next/server';
import { getDb, migrate } from '@/lib/db';

/**
 * PUBLIC mentor + slot availability for an event (no auth).
 * Booking team names are never exposed — only whether a slot is booked.
 */
export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  await migrate();
  const db = getDb();
  const event = (await db
    .prepare("SELECT id, name, slug, status FROM events WHERE slug = ?")
    .get(params.slug)) as
    | { id: string; name: string; slug: string; status: string }
    | undefined;

  if (!event || (event.status !== 'published' && event.status !== 'closed'))
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const mentors = (await db
    .prepare(
      'SELECT id, name, expertise, bio FROM mentors WHERE event_id = ? ORDER BY created_at'
    )
    .all(event.id)) as Array<{
    id: string;
    name: string;
    expertise: string | null;
    bio: string | null;
  }>;

  const result = [];
  for (const m of mentors) {
    const slots = (await db
      .prepare(
        'SELECT id, start_time, end_time, is_booked FROM mentor_slots WHERE mentor_id = ? ORDER BY start_time'
      )
      .all(m.id)) as Array<{ id: string; start_time: string; end_time: string; is_booked: number }>;
    result.push({
      id: m.id,
      name: m.name,
      expertise: m.expertise ?? '',
      bio: m.bio ?? '',
      slots: slots.map((s) => ({
        id: s.id,
        start_time: s.start_time,
        end_time: s.end_time,
        is_booked: Number(s.is_booked) === 1,
      })),
    });
  }

  return NextResponse.json(
    {
      event: { name: event.name, slug: event.slug, status: event.status },
      mentors: result,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
