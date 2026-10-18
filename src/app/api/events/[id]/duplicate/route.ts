import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';

export const dynamic = 'force-dynamic';

/**
 * POST /api/events/[id]/duplicate — organizer-only.
 * Copies the event row (new id, slug '<slug>-copy', status reset to draft)
 * plus its judging criteria rows. Returns the new event id.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const org = await requireOrganizerFromRequest(req);
  if (!org) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, org.id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  await migrate();
  const db = getDb();
  const full = (await db.prepare('SELECT * FROM events WHERE id = ?').get(params.id)) as Record<string, unknown>;

  // Pick a unique slug: <slug>-copy, <slug>-copy-2, …
  let slug = `${full.slug}-copy`;
  let n = 2;
  while (await db.prepare('SELECT id FROM events WHERE slug = ?').get(slug)) {
    slug = `${full.slug}-copy-${n}`;
    n += 1;
  }

  const newId = uuid();
  const now = new Date().toISOString();
  const columns = [
    'id', 'organizer_id', 'name', 'slug', 'description', 'logo_url', 'cover_url',
    'start_date', 'end_date', 'entry_fee', 'status', 'prizes', 'schedule', 'faq',
    'highlight_video_url', 'payment_instructions', 'white_label', 'custom_footer_text',
    'require_team_approval', 'created_at',
  ];
  const values = columns.map((c) => {
    if (c === 'id') return newId;
    if (c === 'name') return `${full.name} (Copy)`;
    if (c === 'slug') return slug;
    if (c === 'status') return 'draft';
    if (c === 'created_at') return now;
    return (full[c] ?? null) as unknown;
  });
  await db
    .prepare(`INSERT INTO events (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`)
    .run(...values);

  // Copy judging criteria.
  const criteria = (await db.prepare('SELECT name, weight, description FROM criteria WHERE event_id = ?').all(params.id)) as {
    name: string;
    weight: number;
    description: string;
  }[];
  for (const c of criteria) {
    await db
      .prepare('INSERT INTO criteria (id, event_id, name, weight, description) VALUES (?, ?, ?, ?, ?)')
      .run(uuid(), newId, c.name, c.weight, c.description);
  }

  return NextResponse.json({ ok: true, id: newId, slug }, { status: 201 });
}
