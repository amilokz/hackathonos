import { NextRequest, NextResponse } from 'next/server';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';
import { csvResponse, datedFilename } from '@/lib/csv';

export const dynamic = 'force-dynamic';

/** GET /api/events/[id]/export/projects — CSV of all projects (organizer only). */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const org = await requireOrganizerFromRequest(req);
  if (!org) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, org.id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  await migrate();
  const db = getDb();
  const projects = (await db
    .prepare(
      `SELECT p.title, t.name AS team_name, t.approval_status AS team_status,
              p.demo_url, p.repo_url, p.created_at
       FROM projects p JOIN teams t ON t.id = p.team_id
       WHERE t.event_id = ? ORDER BY p.created_at`,
    )
    .all(params.id)) as {
    title: string;
    team_name: string;
    team_status: string;
    demo_url: string;
    repo_url: string;
    created_at: string;
  }[];

  return csvResponse(
    datedFilename(event.slug),
    ['project', 'team', 'team_status', 'demo_url', 'repo_url', 'created_at'],
    projects.map((p) => [
      p.title,
      p.team_name,
      p.team_status || 'approved',
      p.demo_url,
      p.repo_url,
      p.created_at,
    ]),
  );
}
