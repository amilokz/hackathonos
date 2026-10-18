import { NextRequest } from 'next/server';
import { getDb, migrate } from '@/lib/db';
import { ensureAnnouncementColumns, ANNOUNCEMENT_TYPES } from '@/lib/announcement-columns';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';

export const dynamic = 'force-dynamic';

const ANNOUNCEMENT_COLUMNS =
  'id, event_id, title, message, type, pinned, created_at';

/** GET /api/events/[id]/announcements — latest 20 announcements (PUBLIC, no auth). Pinned first. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  await migrate();
  await ensureAnnouncementColumns();
  const db = getDb();
  const event = (await db.prepare('SELECT id FROM events WHERE id = ?').get(params.id)) as
    | { id: string }
    | undefined;
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  const rows = await db
    .prepare(
      `SELECT ${ANNOUNCEMENT_COLUMNS} FROM announcements WHERE event_id = ? ORDER BY pinned DESC, created_at DESC, rowid DESC LIMIT 20`
    )
    .all(params.id);
  return Response.json({ announcements: rows });
}

/** POST /api/events/[id]/announcements — post an announcement (organizer only). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await migrate();
  await ensureAnnouncementColumns();
  const organizer = await requireOrganizerFromRequest(req);
  if (!organizer) return Response.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, organizer.id);
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  let body: { title?: string; message?: string; type?: string; pinned?: boolean | number };
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
  const title = String(body.title ?? '').trim();
  if (title.length > 120) {
    return Response.json({ error: 'title must be 120 characters or fewer' }, { status: 400 });
  }
  const type = String(body.type ?? 'info').toLowerCase();
  if (!(ANNOUNCEMENT_TYPES as readonly string[]).includes(type)) {
    return Response.json({ error: `type must be one of: ${ANNOUNCEMENT_TYPES.join(', ')}` }, { status: 400 });
  }
  const pinned = body.pinned === true || body.pinned === 1 ? 1 : 0;

  const db = getDb();
  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  await db
    .prepare(
      'INSERT INTO announcements (id, event_id, title, message, type, pinned, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    .run(id, params.id, title, message, type, pinned, created_at);

  const announcement = await db
    .prepare(`SELECT ${ANNOUNCEMENT_COLUMNS} FROM announcements WHERE id = ?`)
    .get(id);
  return Response.json({ announcement }, { status: 201 });
}
