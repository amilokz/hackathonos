import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { getDb, migrate } from '@/lib/db';

const SubmitProjectSchema = z.object({
  teamId: z.string().trim().min(1),
  title: z.string().trim().min(2).max(140),
  description: z.string().trim().max(3000).default(''),
  demo_url: z.string().trim().max(500).default(''),
  repo_url: z.string().trim().max(500).default(''),
  pitch_text: z.string().trim().max(5000).default(''),
});

/**
 * Submit (or update) a team's project for a published event.
 * One project per team — resubmitting updates the existing entry.
 * Public endpoint.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = SubmitProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Team and project title are required' }, { status: 400 });
  }
  const data = parsed.data;

  await migrate();
  const db = getDb();
  const team = await db.prepare('SELECT id, event_id FROM teams WHERE id = ?').get(data.teamId) as
    | { id: string; event_id: string }
    | undefined;
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

  const event = await db.prepare('SELECT status FROM events WHERE id = ?').get(team.event_id) as
    | { status: string }
    | undefined;
  if (!event || event.status !== 'published') {
    const closed = event?.status === 'closed';
    return NextResponse.json(
      {
        error: closed
          ? 'Submissions are closed — this hackathon has ended'
          : 'Submissions are not open for this event',
      },
      { status: 403 },
    );
  }

  const existing = await db.prepare('SELECT id FROM projects WHERE team_id = ?').get(data.teamId) as
    | { id: string }
    | undefined;
  const now = new Date().toISOString();

  if (existing) {
    await db.prepare(
      `UPDATE projects SET title = ?, description = ?, demo_url = ?, repo_url = ?, pitch_text = ? WHERE id = ?`,
    ).run(data.title, data.description, data.demo_url, data.repo_url, data.pitch_text, existing.id);
    return NextResponse.json({ ok: true, id: existing.id, updated: true });
  }

  const id = uuid();
  await db.prepare(
    `INSERT INTO projects (id, team_id, title, description, demo_url, repo_url, pitch_text, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, data.teamId, data.title, data.description, data.demo_url, data.repo_url, data.pitch_text, now);
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
