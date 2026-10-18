import { getDb } from '@/lib/db';

export interface MentorSlotView {
  id: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  booking: { id: string; team_id: string; team_name: string; booked_at: string } | null;
}

export interface MentorView {
  id: string;
  event_id: string;
  name: string;
  expertise: string;
  bio: string;
  created_at: string;
  slots: MentorSlotView[];
}

interface MentorRow {
  id: string;
  event_id: string;
  name: string;
  expertise: string | null;
  bio: string | null;
  created_at: string;
}

interface SlotBookingRow {
  slot_id: string | null;
  start_time: string | null;
  end_time: string | null;
  is_booked: number | null;
  booking_id: string | null;
  team_id: string | null;
  team_name: string | null;
  booked_at: string | null;
}

/** Mentors for an event, each with slots (sorted by start_time) and bookings incl. team names. */
export async function loadMentors(eventId: string): Promise<MentorView[]> {
  const db = getDb();
  const mentors = (await db
    .prepare(
      'SELECT id, event_id, name, expertise, bio, created_at FROM mentors WHERE event_id = ? ORDER BY created_at'
    )
    .all(eventId)) as MentorRow[];

  const result: MentorView[] = [];
  for (const m of mentors) {
    const rows = (await db
      .prepare(
        `SELECT s.id AS slot_id, s.start_time, s.end_time, s.is_booked,
                b.id AS booking_id, b.team_id, b.booked_at, t.name AS team_name
         FROM mentor_slots s
         LEFT JOIN mentor_bookings b ON b.slot_id = s.id
         LEFT JOIN teams t ON t.id = b.team_id
         WHERE s.mentor_id = ?
         ORDER BY s.start_time`
      )
      .all(m.id)) as SlotBookingRow[];
    result.push({
      id: m.id,
      event_id: m.event_id,
      name: m.name,
      expertise: m.expertise ?? '',
      bio: m.bio ?? '',
      created_at: m.created_at,
      slots: rows
        .filter((r) => r.slot_id)
        .map((r) => ({
          id: r.slot_id as string,
          start_time: r.start_time as string,
          end_time: r.end_time as string,
          is_booked: Number(r.is_booked) === 1,
          booking: r.booking_id
            ? {
                id: r.booking_id,
                team_id: r.team_id ?? '',
                team_name: r.team_name ?? '',
                booked_at: r.booked_at ?? '',
              }
            : null,
        })),
    });
  }
  return result;
}
