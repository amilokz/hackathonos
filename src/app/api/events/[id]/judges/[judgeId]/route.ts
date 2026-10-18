import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';

function unauthorized() {
  return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
}

/** Remove a judge (and their scores stay anonymous under judge_name). */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; judgeId: string } }) {
  const org = await requireOrganizerFromRequest(_req);
  if (!org) return unauthorized();
  const event = await getOwnedEvent(params.id, org.id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const db = getDb();
  const judge = await db
    .prepare('SELECT id FROM judges WHERE id = ? AND event_id = ?')
    .get(params.judgeId, params.id);
  if (!judge) return NextResponse.json({ error: 'Judge not found' }, { status: 404 });

  // Scores keep judge_name so past scoring history still aggregates in results.
  await db.prepare('DELETE FROM judges WHERE id = ?').run(params.judgeId);
  return NextResponse.json({ ok: true });
}
