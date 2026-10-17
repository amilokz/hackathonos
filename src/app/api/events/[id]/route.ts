import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';
import { slugify } from '@/lib/slug';
import type { EventRow } from '@/lib/types';

const UpdateEventSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  slug: z.string().trim().min(2).max(140).optional(),
  description: z.string().trim().max(2000).optional(),
  logo_url: z.string().trim().max(500).optional(),
  start_date: z.string().trim().max(30).optional(),
  end_date: z.string().trim().max(30).optional(),
  entry_fee: z.coerce.number().min(0).max(1000000).optional(),
  status: z.enum(['draft', 'published', 'closed']).optional(),
});

async function owned(req: NextRequest, id: string) {
  const org = await requireOrganizerFromRequest(req);
  if (!org) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  await migrate();
  const event = await getOwnedEvent(id, org.id) as (EventRow & { organizer_id: string }) | null;
  if (!event) return { error: NextResponse.json({ error: 'Event not found' }, { status: 404 }) };
  return { org, event };
}

/** Get one event (must own it). */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await owned(req, params.id);
  if (result.error) return result.error;
  return NextResponse.json({ event: result.event });
}

/** Update an event (must own it). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await owned(req, params.id);
  if (result.error) return result.error;
  const { event } = result;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = UpdateEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid fields' }, { status: 400 });
  }
  const data = parsed.data;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const db = getDb();
  if (data.slug) {
    const clean = slugify(data.slug);
    const clash = await db
      .prepare('SELECT id FROM events WHERE slug = ? AND id != ?')
      .get(clean, event.id);
    if (clash) {
      return NextResponse.json({ error: 'That URL slug is already taken' }, { status: 409 });
    }
    data.slug = clean;
  }

  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(data)) {
    sets.push(`${key} = ?`);
    values.push(value);
  }
  values.push(event.id);
  await db.prepare(`UPDATE events SET ${sets.join(', ')} WHERE id = ?`).run(...values);

  const updated = await db.prepare('SELECT * FROM events WHERE id = ?').get(event.id);
  return NextResponse.json({ ok: true, event: updated });
}
