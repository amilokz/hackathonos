import { NextRequest } from 'next/server';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';

export const dynamic = 'force-dynamic';

/** DELETE /api/events/[id]/announcements/[annId] — remove an announcement (organizer only). */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; annId: string } }
) {
  await migrate();
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
