import { cookies } from 'next/headers';
import { getDb } from './db';
import { verifySession, SESSION_COOKIE_NAME } from './auth';

export interface Organizer {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

/**
 * Reads the session cookie, verifies it, and returns the organizer row.
 * Returns null when not signed in (API routes should answer 401,
 * pages should redirect to /login).
 */
export async function requireOrganizer(): Promise<Organizer | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const organizerId = verifySession(token);
  if (!organizerId) return null;
  const row = (await getDb()
    .prepare('SELECT id, name, email, created_at FROM organizers WHERE id = ?')
    .get(organizerId)) as Organizer | undefined;
  return row ?? null;
}

/** Same as requireOrganizer but for Route Handlers (reads from the request). */
export async function requireOrganizerFromRequest(req: Request): Promise<Organizer | null> {
  const header = req.headers.get('cookie') ?? '';
  const match = header.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  const token = match?.[1];
  if (!token) return null;
  const organizerId = verifySession(decodeURIComponent(token));
  if (!organizerId) return null;
  const row = (await getDb()
    .prepare('SELECT id, name, email, created_at FROM organizers WHERE id = ?')
    .get(organizerId)) as Organizer | undefined;
  return row ?? null;
}

/** Loads an event and ensures it belongs to the organizer. Returns null otherwise. */
export async function getOwnedEvent(eventId: string, organizerId: string) {
  const event = (await getDb().prepare('SELECT * FROM events WHERE id = ?').get(eventId)) as
    | {
        id: string;
        organizer_id: string;
        name: string;
        slug: string;
        description: string;
        status: string;
      }
    | undefined;
  if (!event || event.organizer_id !== organizerId) return null;
  return event;
}
