import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireOrganizerFromRequest } from '@/lib/require-organizer';

function unauthorized() {
  return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
}

/** Load a criterion and ensure the signed-in organizer owns its event. */
async function ownedCriterion(cid: string, organizerId: string) {
  const row = await getDb()
    .prepare(
      `SELECT c.* FROM criteria c
       JOIN events e ON e.id = c.event_id
       WHERE c.id = ? AND e.organizer_id = ?`
    )
    .get(cid, organizerId) as { id: string } | undefined;
  return row ?? null;
}

/** Update a criterion. Body may contain: { name?, weight?, description? } */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { cid: string } }
) {
  const org = await requireOrganizerFromRequest(req);
  if (!org) return unauthorized();
  if (!(await ownedCriterion(params.cid, org.id))) {
    return NextResponse.json({ error: 'Criterion not found' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
    updates.push('name = ?');
    values.push(name);
  }
  if (body.weight !== undefined) {
    const weight = Number(body.weight);
    if (!Number.isFinite(weight) || weight <= 0 || weight > 100) {
      return NextResponse.json({ error: 'Weight must be a number between 0 and 100' }, { status: 400 });
    }
    updates.push('weight = ?');
    values.push(weight);
  }
  if (body.description !== undefined) {
    updates.push('description = ?');
    values.push(String(body.description));
  }
  if (updates.length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  values.push(params.cid);
  await getDb().prepare(`UPDATE criteria SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  const criterion = await getDb().prepare('SELECT * FROM criteria WHERE id = ?').get(params.cid);
  return NextResponse.json({ criterion });
}

/** Delete a criterion (its scores are removed by cascade). */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { cid: string } }
) {
  const org = await requireOrganizerFromRequest(req);
  if (!org) return unauthorized();
  if (!(await ownedCriterion(params.cid, org.id))) {
    return NextResponse.json({ error: 'Criterion not found' }, { status: 404 });
  }
  await getDb().prepare('DELETE FROM criteria WHERE id = ?').run(params.cid);
  return NextResponse.json({ ok: true });
}
