import { NextRequest, NextResponse } from 'next/server';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';
import { csvResponse, datedFilename } from '@/lib/csv';

export const dynamic = 'force-dynamic';

function membersLabel(json: string): string {
  try {
    const arr = JSON.parse(json || '[]') as string[];
    return arr.filter(Boolean).join('; ');
  } catch {
    return '';
  }
}

/** GET /api/events/[id]/export/teams — CSV of all teams (organizer only). */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const org = await requireOrganizerFromRequest(req);
  if (!org) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, org.id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  await migrate();
  const db = getDb();
  const teams = (await db
    .prepare(
      `SELECT name, contact_name, contact_email, contact_phone, members_json, approval_status, created_at
       FROM teams WHERE event_id = ? ORDER BY created_at`,
    )
    .all(params.id)) as {
    name: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    members_json: string;
    approval_status: string;
    created_at: string;
  }[];

  return csvResponse(
    datedFilename(event.slug),
    ['team', 'contact_name', 'contact_email', 'contact_phone', 'members', 'status', 'created_at'],
    teams.map((t) => [
      t.name,
      t.contact_name,
      t.contact_email,
      t.contact_phone,
      membersLabel(t.members_json),
      t.approval_status || 'approved',
      t.created_at,
    ]),
  );
}
