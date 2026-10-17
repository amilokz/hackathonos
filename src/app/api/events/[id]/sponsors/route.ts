import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';

export const dynamic = 'force-dynamic';

const TIERS = ['platinum', 'gold', 'silver'] as const;

/** GET /api/events/[id]/sponsors — list sponsors for an event (organizer only). */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  await migrate();
  const organizer = await requireOrganizerFromRequest(req);
  if (!organizer) return Response.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, organizer.id);
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  const db = getDb();
  const rows = await db
    .prepare(
      'SELECT id, name, logo_url, tier, website FROM sponsors WHERE event_id = ? ORDER BY tier, name',
    )
    .all(params.id);
  return Response.json({ sponsors: rows });
}

/** POST /api/events/[id]/sponsors — add a sponsor (organizer only). */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  await migrate();
  const organizer = await requireOrganizerFromRequest(req);
  if (!organizer) return Response.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, organizer.id);
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  let body: { name?: string; logo_url?: string; tier?: string; website?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = (body.name ?? '').trim();
  if (!name) return Response.json({ error: 'name is required' }, { status: 400 });
  const tier = (body.tier ?? 'silver').toLowerCase();
  if (!(TIERS as readonly string[]).includes(tier)) {
    return Response.json({ error: `tier must be one of: ${TIERS.join(', ')}` }, { status: 400 });
  }

  const db = getDb();
  const id = crypto.randomUUID();
  await db.prepare(
    'INSERT INTO sponsors (id, event_id, name, logo_url, tier, website) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, params.id, name, (body.logo_url ?? '').trim(), tier, (body.website ?? '').trim());

  const sponsor = await db.prepare('SELECT id, name, logo_url, tier, website FROM sponsors WHERE id = ?').get(id);
  return Response.json({ sponsor }, { status: 201 });
}
