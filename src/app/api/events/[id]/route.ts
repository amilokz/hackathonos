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
  cover_url: z.string().trim().max(500).optional(),
  start_date: z.string().trim().max(30).optional(),
  end_date: z.string().trim().max(30).optional(),
  entry_fee: z.coerce.number().min(0).max(1000000).optional(),
  status: z.enum(['draft', 'published', 'closed']).optional(),
  prizes: z.string().trim().max(4000).optional(),
  schedule: z.string().trim().max(4000).optional(),
  faq: z.string().trim().max(4000).optional(),
  highlight_video_url: z.string().trim().max(500).optional(),
  event_type: z.enum(['hackathon', 'webinar', 'seminar', 'workshop']).optional(),
  meeting_link: z.string().trim().max(500).optional(),
  whatsapp_group_link: z.string().trim().max(500).optional(),
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
  // Always bump updated_at so cover-image cache-busting works.
  sets.push(`updated_at = ?`);
  values.push(new Date().toISOString());
  values.push(event.id);
  await db.prepare(`UPDATE events SET ${sets.join(', ')} WHERE id = ?`).run(...values);

  const updated = await db.prepare('SELECT * FROM events WHERE id = ?').get(event.id);
  return NextResponse.json({ ok: true, event: updated });
}

/** Delete an event and everything under it (must own it). */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await owned(req, params.id);
  if (result.error) return result.error;
  const { event } = result;

  const db = getDb();
  // Explicit child deletes first (safe even where FK enforcement is off),
  // then the event row itself.
  await db.prepare('DELETE FROM scores WHERE project_id IN (SELECT p.id FROM projects p JOIN teams t ON t.id = p.team_id WHERE t.event_id = ?)').run(event.id);
  await db.prepare('DELETE FROM ai_scores WHERE project_id IN (SELECT p.id FROM projects p JOIN teams t ON t.id = p.team_id WHERE t.event_id = ?)').run(event.id);
  await db.prepare('DELETE FROM projects WHERE team_id IN (SELECT id FROM teams WHERE event_id = ?)').run(event.id);
  await db.prepare('DELETE FROM checkins WHERE event_id = ?').run(event.id);
  await db.prepare('DELETE FROM announcements WHERE event_id = ?').run(event.id);
  await db.prepare('DELETE FROM certificates WHERE event_id = ?').run(event.id);
  await db.prepare('DELETE FROM sponsors WHERE event_id = ?').run(event.id);
  await db.prepare('DELETE FROM judges WHERE event_id = ?').run(event.id);
  await db.prepare('DELETE FROM criteria WHERE event_id = ?').run(event.id);
  await db.prepare('DELETE FROM teams WHERE event_id = ?').run(event.id);
  await db.prepare('DELETE FROM individual_registrations WHERE event_id = ?').run(event.id);
  await db.prepare('DELETE FROM events WHERE id = ?').run(event.id);

  return NextResponse.json({ ok: true });
}
