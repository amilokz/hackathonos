import { NextRequest } from 'next/server';
import { getDb, migrate } from '@/lib/db';
import { ensureAnnouncementColumns, ANNOUNCEMENT_TYPES } from '@/lib/announcement-columns';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';

export const dynamic = 'force-dynamic';

const ANNOUNCEMENT_COLUMNS =
  'id, event_id, title, message, type, pinned, created_at';

/** PATCH /api/events/[id]/announcements/[annId] — update title/message/type/pinned (organizer only). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; annId: string } }
) {
  await migrate();
  await ensureAnnouncementColumns();
  const organizer = await requireOrganizerFromRequest(req);
  if (!organizer) return Response.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, organizer.id);
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  const db = getDb();
  const existing = (await db
    .prepare('SELECT id FROM announcements WHERE id = ? AND event_id = ?')
    .get(params.annId, params.id)) as { id: string } | undefined;
  if (!existing) return Response.json({ error: 'Announcement not found' }, { status: 404 });

  let body: { title?: string; message?: string; type?: string; pinned?: boolean | number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (title.length > 120) {
      return Response.json({ error: 'title must be 120 characters or fewer' }, { status: 400 });
    }
    updates.push('title = ?');
    values.push(title);
  }
  if (body.message !== undefined) {
    const message = String(body.message).trim();
    if (!message) return Response.json({ error: 'message cannot be empty' }, { status: 400 });
    if (message.length > 500) {
      return Response.json({ error: 'message must be 500 characters or fewer' }, { status: 400 });
    }
    updates.push('message = ?');
    values.push(message);
  }
  if (body.type !== undefined) {
    const type = String(body.type).toLowerCase();
    if (!(ANNOUNCEMENT_TYPES as readonly string[]).includes(type)) {
      return Response.json({ error: `type must be one of: ${ANNOUNCEMENT_TYPES.join(', ')}` }, { status: 400 });
    }
    updates.push('type = ?');
    values.push(type);
  }
  if (body.pinned !== undefined) {
    updates.push('pinned = ?');
    values.push(body.pinned === true || body.pinned === 1 ? 1 : 0);
  }
  if (updates.length === 0) {
    return Response.json({ error: 'Nothing to update' }, { status: 400 });
  }

  values.push(params.annId, params.id);
  await db
    .prepare(`UPDATE announcements SET ${updates.join(', ')} WHERE id = ? AND event_id = ?`)
    .run(...values);
  const announcement = await db
    .prepare(`SELECT ${ANNOUNCEMENT_COLUMNS} FROM announcements WHERE id = ?`)
    .get(params.annId);
  return Response.json({ announcement });
}

/** DELETE /api/events/[id]/announcements/[annId] — remove an announcement (organizer only). */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; annId: string } }
) {
  await migrate();
  await ensureAnnouncementColumns();
  const organizer = await requireOrganizerFromRequest(req);
  if (!organizer) return Response.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, organizer.id);
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  const db = getDb();
  const existing = (await db
    .prepare('SELECT id FROM announcements WHERE id = ? AND event_id = ?')
    .get(params.annId, params.id)) as { id: string } | undefined;
  if (!existing) return Response.json({ error: 'Announcement not found' }, { status: 404 });

  await db.prepare('DELETE FROM announcements WHERE id = ?').run(params.annId);
  return Response.json({ ok: true });
}
