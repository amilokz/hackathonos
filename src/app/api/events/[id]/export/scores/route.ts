import { NextRequest, NextResponse } from 'next/server';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';
import { csvResponse, datedFilename } from '@/lib/csv';

export const dynamic = 'force-dynamic';

/**
 * GET /api/events/[id]/export/scores — score matrix CSV (organizer only).
 * One row per (project × judge); one column per judging criterion.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const org = await requireOrganizerFromRequest(req);
  if (!org) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, org.id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  await migrate();
  const db = getDb();

  const criteria = (await db
    .prepare('SELECT id, name FROM criteria WHERE event_id = ? ORDER BY rowid')
    .all(params.id)) as { id: string; name: string }[];

  const projects = (await db
    .prepare(
      `SELECT p.id, p.title, t.name AS team_name, t.approval_status AS team_status
       FROM projects p JOIN teams t ON t.id = p.team_id
       WHERE t.event_id = ? ORDER BY p.created_at`,
    )
    .all(params.id)) as { id: string; title: string; team_name: string; team_status: string }[];

  const scoreRows = (await db
    .prepare(
      `SELECT s.project_id, s.judge_name, s.criteria_id, s.score
       FROM scores s
       JOIN projects p ON p.id = s.project_id
       JOIN teams t ON t.id = p.team_id
       WHERE t.event_id = ?`,
    )
    .all(params.id)) as { project_id: string; judge_name: string; criteria_id: string; score: number }[];

  // judge -> project -> criterion -> score
  const byJudgeProject = new Map<string, Map<string, Map<string, number>>>();
  for (const s of scoreRows) {
    if (!byJudgeProject.has(s.judge_name)) byJudgeProject.set(s.judge_name, new Map());
    const pm = byJudgeProject.get(s.judge_name)!;
    if (!pm.has(s.project_id)) pm.set(s.project_id, new Map());
    pm.get(s.project_id)!.set(s.criteria_id, s.score);
  }
  const judges = Array.from(byJudgeProject.keys()).sort((a, b) => a.localeCompare(b));

  const header = ['project', 'team', 'team_status', 'judge', ...criteria.map((c) => c.name)];
  const rows: (string | number | null | undefined)[][] = [];
  for (const p of projects) {
    for (const judge of judges) {
      const critScores = byJudgeProject.get(judge)?.get(p.id);
      rows.push([
        p.title,
        p.team_name,
        p.team_status || 'approved',
        judge,
        ...criteria.map((c) => {
          const v = critScores?.get(c.id);
          return v === undefined ? '' : Math.round(v * 100) / 100;
        }),
      ]);
    }
  }

  return csvResponse(datedFilename(event.slug), header, rows);
}
