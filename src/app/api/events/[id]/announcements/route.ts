import { NextRequest } from 'next/server';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';

export const dynamic = 'force-dynamic';

/** GET /api/events/[id]/announcements — latest 20 announcements (PUBLIC, no auth). */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await migrate();
  const db = getDb();
  const event = (await db.prepare('SELECT id FROM events WHERE id = ?').get(params.id)) as
    | { id: string }
    | undefined;
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  const rows = await db
    .prepare(
      'SELECT id, event_id, message, created_at FROM announcements WHERE event_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 20'
    )
    .all(params.id);
  return Response.json({ announcements: rows });
}

/** POST /api/events/[id]/announcements — post an announcement (organizer only). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await migrate();
  const organizer = await requireOrganizerFromRequest(req);
  if (!organizer) return Response.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, organizer.id);
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const message = (body.message ?? '').trim();
  if (!message) return Response.json({ error: 'message is required' }, { status: 400 });
  if (message.length > 500) {
    return Response.json({ error: 'message must be 500 characters or fewer' }, { status: 400 });
  }

  const db = getDb();
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  await db
    .prepare('INSERT INTO announcements (id, event_id, message, created_at) VALUES (?, ?, ?, ?)')
    .run(id, params.id, message, created_at);

  const announcement = await db
    .prepare('SELECT id, event_id, message, created_at FROM announcements WHERE id = ?')
    .get(id);
  return Response.json({ announcement }, { status: 201 });
}
