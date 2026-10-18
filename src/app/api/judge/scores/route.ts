import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getDb, migrate } from '@/lib/db';
import { requireJudgeFromRequest } from '@/lib/judge-auth';

interface ScoreInput {
  project_id: string;
  criteria_id: string;
  score: number;
  notes?: string;
}

/**
 * Submit judge scores. Judge-authenticated (cookie).
 * Body: { project_id, overall_notes?, scores: [{ criteria_id, score (0-10), notes? }] }
 * Re-submitting the same judge + criterion overwrites the previous score.
 * judge_name is stored alongside judge_id so the existing results aggregation
 * (which groups by judge_name) keeps working.
 */
export async function POST(req: NextRequest) {
  const judge = await requireJudgeFromRequest(req);
  if (!judge) return NextResponse.json({ error: 'Not signed in as a judge' }, { status: 401 });

  await migrate();
  const raw = await req.json().catch(() => null);
  const project_id = String(raw?.project_id ?? '');
  const overall_notes = String(raw?.overall_notes ?? '');
  const inputs: ScoreInput[] = Array.isArray(raw?.scores) ? raw.scores : [];
  if (!project_id) {
    return NextResponse.json({ error: 'project_id is required' }, { status: 400 });
  }
  if (inputs.length === 0) {
    return NextResponse.json({ error: 'No scores provided' }, { status: 400 });
  }

  const db = getDb();
  const now = new Date().toISOString();

  try {
    // Project must belong to the judge's event.
    const project = await db
      .prepare(
        `SELECT p.id FROM projects p
         JOIN teams t ON t.id = p.team_id
         WHERE p.id = ? AND t.event_id = ?`,
      )
      .get(project_id, judge.event_id);
    if (!project) throw new Error('Project not found');

    const criterionIds = await db
      .prepare('SELECT id FROM criteria WHERE event_id = ?')
      .all(judge.event_id);
    const validCriteria = new Set(criterionIds.map((c: { id: string }) => c.id));

    const validated: { criteria_id: string; score: number; notes: string }[] = [];
    for (const s of inputs) {
      const criteria_id = String(s.criteria_id ?? '');
      const score = Number(s.score);
      const notes = String(s.notes ?? '');
      if (!validCriteria.has(criteria_id)) throw new Error('Invalid criterion');
      if (!Number.isFinite(score) || score < 0 || score > 10) {
        throw new Error('Scores must be between 0 and 10');
      }
      validated.push({ criteria_id, score, notes });
    }

    const batch: { sql: string; args: unknown[] }[] = [];
    for (const v of validated) {
      batch.push({
        sql: 'DELETE FROM scores WHERE project_id = ? AND judge_id = ? AND criteria_id = ?',
        args: [project_id, judge.id, v.criteria_id],
      });
      batch.push({
        sql: 'INSERT INTO scores (id, project_id, judge_id, judge_name, criteria_id, score, notes, overall_notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [randomUUID(), project_id, judge.id, judge.name, v.criteria_id, v.score, v.notes, overall_notes, now],
      });
    }
    // Keep overall_notes in sync on any existing rows for this judge+project
    // (e.g. criteria the judge chose not to re-score).
    batch.push({
      sql: 'UPDATE scores SET overall_notes = ? WHERE project_id = ? AND judge_id = ?',
      args: [overall_notes, project_id, judge.id],
    });
    await db.batch(batch);

    return NextResponse.json({ ok: true, saved: validated.length }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/**
 * Load a judge's existing scores for a project (prefill the scoring form).
 * GET /api/judge/scores?project_id=…
 */
export async function GET(req: NextRequest) {
  const judge = await requireJudgeFromRequest(req);
  if (!judge) return NextResponse.json({ error: 'Not signed in as a judge' }, { status: 401 });

  const projectId = new URL(req.url).searchParams.get('project_id') ?? '';
  const db = getDb();

  const project = await db
    .prepare(
      `SELECT p.id FROM projects p
       JOIN teams t ON t.id = p.team_id
       WHERE p.id = ? AND t.event_id = ?`,
    )
    .get(projectId, judge.event_id);
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const rows = await db
    .prepare(
      'SELECT criteria_id, score, notes, overall_notes FROM scores WHERE project_id = ? AND judge_id = ?',
    )
    .all(projectId, judge.id);

  const scores: Record<string, { score: number; notes: string }> = {};
  let overall_notes = '';
  for (const r of rows as { criteria_id: string; score: number; notes: string; overall_notes: string }[]) {
    scores[r.criteria_id] = { score: r.score, notes: r.notes ?? '' };
    overall_notes = r.overall_notes ?? '';
  }
  return NextResponse.json({ scores, overall_notes });
}
