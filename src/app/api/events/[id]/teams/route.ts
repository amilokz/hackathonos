import { NextRequest, NextResponse } from 'next/server';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';

export const dynamic = 'force-dynamic';

/**
 * GET /api/events/[id]/teams — all teams for an event, any approval status
 * (organizer only). Powers the PendingApprovals + TeamsTable dashboard components.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const org = await requireOrganizerFromRequest(req);
  if (!org) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, org.id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  await migrate();
  const db = getDb();
  const teams = await db
    .prepare(
      `SELECT id, name, contact_name, contact_email, contact_phone, members_json,
              approval_status, created_at
       FROM teams WHERE event_id = ? ORDER BY created_at DESC`,
    )
    .all(params.id);

  return NextResponse.json({ teams });
}
