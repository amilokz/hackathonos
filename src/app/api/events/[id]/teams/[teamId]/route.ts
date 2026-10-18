import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';

export const dynamic = 'force-dynamic';

const UpdateTeamSchema = z.object({
  looking_for: z.string().trim().max(300).optional(),
  is_open: z.union([z.boolean(), z.number().int()]).optional(),
});

/**
 * PATCH /api/events/[id]/teams/[teamId] — organizer updates Team Finder
 * settings for a team: looking_for ("Need a designer + backend dev") and
 * is_open (whether the team appears in the public Team Finder).
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string; teamId: string } }) {
  const org = await requireOrganizerFromRequest(req);
  if (!org) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, org.id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = UpdateTeamSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update — send looking_for and/or is_open' }, { status: 400 });
  }

  await migrate();
  const db = getDb();
  const team = (await db
    .prepare('SELECT id FROM teams WHERE id = ? AND event_id = ?')
    .get(params.teamId, params.id)) as { id: string } | undefined;
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

  const sets: string[] = [];
  const args: unknown[] = [];
  if (parsed.data.looking_for !== undefined) {
    sets.push('looking_for = ?');
    args.push(parsed.data.looking_for);
  }
  if (parsed.data.is_open !== undefined) {
    sets.push('is_open = ?');
    args.push(parsed.data.is_open === true || parsed.data.is_open === 1 ? 1 : 0);
  }
  args.push(params.teamId);
  await db.prepare(`UPDATE teams SET ${sets.join(', ')} WHERE id = ?`).run(...args);

  const updated = (await db
    .prepare('SELECT id, looking_for, is_open, invite_code FROM teams WHERE id = ?')
    .get(params.teamId)) as { id: string; looking_for: string; is_open: number; invite_code: string };

  return NextResponse.json({ ok: true, team: updated });
}
