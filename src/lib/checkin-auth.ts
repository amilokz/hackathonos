import { NextRequest, NextResponse } from 'next/server';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';

export interface CheckinTeam {
  id: string;
  name: string;
  checkin_code: string;
}

export interface CheckinEvent {
  id: string;
  name: string;
  slug: string;
  organizer_id: string;
}

/**
 * Shared guard for all check-in API routes: valid organizer session +
 * the event belongs to the organizer. Returns the owned event or an
 * error response tuple.
 */
export async function ownedCheckinEvent(req: NextRequest, eventId: string) {
  const org = await requireOrganizerFromRequest(req);
  if (!org) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  await migrate();
  const event = (await getOwnedEvent(eventId, org.id)) as CheckinEvent | null;
  if (!event) return { error: NextResponse.json({ error: 'Event not found' }, { status: 404 }) };
  return { org, event };
}

/** Find a team in this event by its (case-insensitive) check-in code. */
export async function findTeamByCode(eventId: string, rawCode: string): Promise<CheckinTeam | null> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return null;
  const db = getDb();
  const team = (await db
    .prepare('SELECT id, name, checkin_code FROM teams WHERE event_id = ? AND upper(checkin_code) = ?')
    .get(eventId, code)) as CheckinTeam | undefined;
  return team ?? null;
}

/** Parse the JSON member-name list stored on a team row. */
export function parseMembers(membersJson: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(membersJson ?? '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map((m) => String(m).trim()).filter(Boolean);
  } catch {
    return [];
  }
}
