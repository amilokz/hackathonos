import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest } from '@/lib/require-organizer';
import { slugify, uniqueSlug } from '@/lib/slug';
import type { EventRow } from '@/lib/types';

/** Default judging criteria seeded on every new event. */
const DEFAULT_CRITERIA = [
  { name: 'Innovation', weight: 25, description: 'How original and creative is the idea?' },
  { name: 'Technical Execution', weight: 25, description: 'Quality of implementation and engineering.' },
  { name: 'Impact', weight: 20, description: 'Real-world usefulness and potential impact.' },
  { name: 'Presentation', weight: 15, description: 'Clarity of the demo and pitch.' },
  { name: 'Feasibility', weight: 15, description: 'Can it realistically be built and sustained?' },
];

const CreateEventSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).default(''),
  logo_url: z.string().trim().max(500).default(''),
  cover_url: z.string().trim().max(500).default(''),
  start_date: z.string().trim().max(30).default(''),
  end_date: z.string().trim().max(30).default(''),
  entry_fee: z.coerce.number().min(0).max(1000000).default(0),
  prizes: z.string().trim().max(4000).default(''),
  schedule: z.string().trim().max(4000).default(''),
  faq: z.string().trim().max(4000).default(''),
  highlight_video_url: z.string().trim().max(500).default(''),
});

/** List the signed-in organizer's events. */
export async function GET(req: NextRequest) {
  const org = await requireOrganizerFromRequest(req);
  if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await migrate();
  const events = (await getDb()
    .prepare('SELECT * FROM events WHERE organizer_id = ? ORDER BY created_at DESC')
    .all(org.id)) as EventRow[];
  return NextResponse.json({ events });
}

/** Create an event + seed default judging criteria. */
export async function POST(req: NextRequest) {
  const org = await requireOrganizerFromRequest(req);
  if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = CreateEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Event name (2+ chars) is required' }, { status: 400 });
  }

  await migrate();
  const db = getDb();
  const slug = await uniqueSlug(slugify(parsed.data.name), async (s) =>
    Boolean(await db.prepare('SELECT 1 FROM events WHERE slug = ?').get(s)),
  );

  const id = uuid();
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO events (id, organizer_id, name, slug, description, logo_url, cover_url, start_date, end_date, entry_fee, prizes, schedule, faq, highlight_video_url, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
    )
    .run(
      id,
      org.id,
      parsed.data.name,
      slug,
      parsed.data.description,
      parsed.data.logo_url,
      parsed.data.cover_url,
      parsed.data.start_date,
      parsed.data.end_date,
      parsed.data.entry_fee,
      parsed.data.prizes,
      parsed.data.schedule,
      parsed.data.faq,
      parsed.data.highlight_video_url,
      now,
      now,
    );

  await db.batch(
    DEFAULT_CRITERIA.map((c) => ({
      sql: 'INSERT INTO criteria (id, event_id, name, weight, description) VALUES (?, ?, ?, ?, ?)',
      args: [uuid(), id, c.name, c.weight, c.description],
    })),
  );

  return NextResponse.json({ ok: true, id, slug }, { status: 201 });
}
