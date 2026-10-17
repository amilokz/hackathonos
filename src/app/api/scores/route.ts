import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getDb } from '@/lib/db';
import { requireOrganizerFromRequest } from '@/lib/require-organizer';

interface ScoreInput {
  project_id: string;
  judge_name: string;
  criteria_id: string;
  score: number;
  notes?: string;
}

interface ValidatedScore extends ScoreInput {
  id: string;
  created_at: string;
}

/**
 * Submit judge scores. Accepts a single score object or an array (batch).
 * Body: { project_id, judge_name, criteria_id, score (0-10), notes? }
 * Re-submitting the same judge + criterion overwrites the previous score.
 */
export async function POST(req: NextRequest) {
  const org = await requireOrganizerFromRequest(req);
  if (!org) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const inputs: ScoreInput[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
  if (inputs.length === 0) {
    return NextResponse.json({ error: 'No scores provided' }, { status: 400 });
  }

  const db = getDb();
  const now = new Date().toISOString();

  try {
    // Validate everything first (reads), then write atomically via batch.
    const validated: ValidatedScore[] = [];
    for (const s of inputs) {
      const project_id = String(s.project_id ?? '');
      const judge_name = String(s.judge_name ?? '').trim();
      const criteria_id = String(s.criteria_id ?? '');
      const score = Number(s.score);
      const notes = String(s.notes ?? '');

      if (!project_id || !judge_name || !criteria_id) {
        throw new Error('project_id, judge_name and criteria_id are required');
      }
      if (!Number.isFinite(score) || score < 0 || score > 10) {
        throw new Error('score must be between 0 and 10');
      }
      const project = await db
        .prepare(
          `SELECT p.id FROM projects p
           JOIN teams t ON t.id = p.team_id
           JOIN events e ON e.id = t.event_id
           WHERE p.id = ? AND e.organizer_id = ?`,
        )
        .get(project_id, org.id);
      if (!project) throw new Error('Project not found');
      const criterion = await db
        .prepare(
          `SELECT c.id FROM criteria c
           JOIN events e ON e.id = c.event_id
           WHERE c.id = ? AND e.organizer_id = ?`,
        )
        .get(criteria_id, org.id);
      if (!criterion) throw new Error('Criterion not found');

      validated.push({
        id: randomUUID(),
        project_id,
        judge_name,
        criteria_id,
        score,
        notes,
        created_at: now,
      });
    }

    const batch: { sql: string; args: unknown[] }[] = [];
    for (const v of validated) {
      batch.push({
        sql: 'DELETE FROM scores WHERE project_id = ? AND judge_name = ? AND criteria_id = ?',
        args: [v.project_id, v.judge_name, v.criteria_id],
      });
      batch.push({
        sql: 'INSERT INTO scores (id, project_id, judge_name, criteria_id, score, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [v.id, v.project_id, v.judge_name, v.criteria_id, v.score, v.notes, v.created_at],
      });
    }
    await db.batch(batch);

    const saved = validated.map(({ id, project_id, judge_name, criteria_id, score, notes }) => ({
      id,
      project_id,
      judge_name,
      criteria_id,
      score,
      notes,
    }));
    return NextResponse.json({ scores: saved }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
