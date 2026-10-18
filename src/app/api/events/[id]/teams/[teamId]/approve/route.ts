import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';

const ApproveSchema = z.object({
  action: z.enum(['approve', 'reject']),
});

export const dynamic = 'force-dynamic';

/**
 * POST /api/events/[id]/teams/[teamId]/approve
 * Organizer-only: { action: 'approve' | 'reject' } flips the team's approval_status.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string; teamId: string } }) {
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
  const parsed = ApproveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "action must be 'approve' or 'reject'" }, { status: 400 });
  }

  await migrate();
  const db = getDb();
  const team = await db
    .prepare('SELECT id FROM teams WHERE id = ? AND event_id = ?')
    .get(params.teamId, params.id) as { id: string } | undefined;
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

  const status = parsed.data.action === 'approve' ? 'approved' : 'rejected';
  await db.prepare('UPDATE teams SET approval_status = ? WHERE id = ?').run(status, params.teamId);

  return NextResponse.json({ ok: true, teamId: params.teamId, approval_status: status });
}
