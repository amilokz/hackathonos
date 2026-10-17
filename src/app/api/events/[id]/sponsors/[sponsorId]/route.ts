import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';

export const dynamic = 'force-dynamic';

const TIERS = ['platinum', 'gold', 'silver'] as const;

/** PATCH /api/events/[id]/sponsors/[sponsorId] — update a sponsor (organizer only). */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; sponsorId: string } },
) {
  await migrate();
  const organizer = await requireOrganizerFromRequest(req);
  if (!organizer) return Response.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, organizer.id);
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  const db = getDb();
  const existing = await db
    .prepare('SELECT id FROM sponsors WHERE id = ? AND event_id = ?')
    .get(params.sponsorId, params.id);
  if (!existing) return Response.json({ error: 'Sponsor not found' }, { status: 404 });

  let body: { name?: string; logo_url?: string; tier?: string; website?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return Response.json({ error: 'name cannot be empty' }, { status: 400 });
    updates.push('name = ?');
    values.push(name);
  }
  if (body.logo_url !== undefined) {
    updates.push('logo_url = ?');
    values.push(String(body.logo_url).trim());
  }
  if (body.website !== undefined) {
    updates.push('website = ?');
    values.push(String(body.website).trim());
  }
  if (body.tier !== undefined) {
    const tier = String(body.tier).toLowerCase();
    if (!(TIERS as readonly string[]).includes(tier)) {
      return Response.json({ error: `tier must be one of: ${TIERS.join(', ')}` }, { status: 400 });
    }
    updates.push('tier = ?');
    values.push(tier);
  }
  if (updates.length === 0) {
    return Response.json({ error: 'Nothing to update' }, { status: 400 });
  }

  values.push(params.sponsorId, params.id);
  await db.prepare(`UPDATE sponsors SET ${updates.join(', ')} WHERE id = ? AND event_id = ?`).run(...values);
  const sponsor = await db
    .prepare('SELECT id, name, logo_url, tier, website FROM sponsors WHERE id = ?')
    .get(params.sponsorId);
  return Response.json({ sponsor });
}

/** DELETE /api/events/[id]/sponsors/[sponsorId] — remove a sponsor (organizer only). */
export async function DELETE(req: Request, { params }: { params: { id: string; sponsorId: string } }) {
  await migrate();
  const organizer = await requireOrganizerFromRequest(req);
  if (!organizer) return Response.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, organizer.id);
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  const db = getDb();
  const result = await db
    .prepare('DELETE FROM sponsors WHERE id = ? AND event_id = ?')
    .run(params.sponsorId, params.id);
  if (result.changes === 0) return Response.json({ error: 'Sponsor not found' }, { status: 404 });
  return Response.json({ deleted: true });
}
