import { NextRequest, NextResponse } from 'next/server';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';
import { generateUniqueInviteCode } from '@/lib/team-finder';

export const dynamic = 'force-dynamic';

/**
 * POST /api/events/[id]/teams/[teamId]/invite-code — organizer regenerates
 * the team's human-readable invite code (e.g. "TEAM-X7K2P"). The old code
 * stops working immediately.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string; teamId: string } }) {
  const org = await requireOrganizerFromRequest(req);
  if (!org) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, org.id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  await migrate();
  const db = getDb();
  const team = (await db
    .prepare('SELECT id, invite_code FROM teams WHERE id = ? AND event_id = ?')
    .get(params.teamId, params.id)) as { id: string; invite_code: string } | undefined;
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

  const invite_code = await generateUniqueInviteCode();
  await db.prepare('UPDATE teams SET invite_code = ? WHERE id = ?').run(invite_code, params.teamId);

  return NextResponse.json({ ok: true, invite_code });
}
