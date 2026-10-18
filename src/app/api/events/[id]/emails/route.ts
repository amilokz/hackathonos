import { NextRequest } from 'next/server';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';

export const dynamic = 'force-dynamic';

export interface EmailLogRow {
  id: string;
  to_email: string;
  subject: string;
  type: string;
  sent_at: string;
  status: string;
}

/** GET /api/events/[id]/emails — recent email log for the event (organizer only). */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  await migrate();
  const organizer = await requireOrganizerFromRequest(req);
  if (!organizer) return Response.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, organizer.id);
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  const db = getDb();
  const rows = (await db
    .prepare(
      `SELECT id, to_email, subject, type, sent_at, status FROM email_log
       WHERE event_id = ? ORDER BY sent_at DESC, rowid DESC LIMIT 50`,
    )
    .all(params.id)) as EmailLogRow[];
  return Response.json({ emails: rows });
}
