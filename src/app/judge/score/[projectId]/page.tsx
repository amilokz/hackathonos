import { redirect } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { requireJudge } from '@/lib/judge-auth';
import ScoreForm from './ScoreForm';

export interface CriterionInfo {
  id: string;
  name: string;
  weight: number;
  description: string;
}

export interface ExistingScore {
  score: string;
  notes: string;
}

export default async function ScoreProjectPage({ params }: { params: { projectId: string } }) {
  const judge = await requireJudge();
  if (!judge) redirect('/judge/login');

  await migrate();
  const db = getDb();

  const event = await db
    .prepare('SELECT id, name FROM events WHERE id = ?')
    .get(judge.event_id) as { id: string; name: string } | undefined;
  if (!event) redirect('/judge/login');

  const project = (await db
    .prepare(
      `SELECT p.id, p.title, p.description, p.demo_url, p.repo_url, p.pitch_text, t.name AS team_name
       FROM projects p
       JOIN teams t ON t.id = p.team_id
       WHERE p.id = ? AND t.event_id = ? AND t.approval_status = 'approved'`,
    )
    .get(params.projectId, judge.event_id)) as
    | {
        id: string;
        title: string;
        description: string;
        demo_url: string;
        repo_url: string;
        pitch_text: string;
        team_name: string;
      }
    | undefined;
  if (!project) redirect('/judge');

  const criteria = (await db
    .prepare('SELECT id, name, weight, description FROM criteria WHERE event_id = ? ORDER BY rowid')
    .all(judge.event_id)) as CriterionInfo[];

  const rows = (await db
    .prepare(
      'SELECT criteria_id, score, notes, overall_notes FROM scores WHERE project_id = ? AND judge_id = ?',
    )
    .all(params.projectId, judge.id)) as {
    criteria_id: string;
    score: number;
    notes: string;
    overall_notes: string;
  }[];

  const existing: Record<string, ExistingScore> = {};
  let overallNotes = '';
  for (const r of rows) {
    existing[r.criteria_id] = { score: String(r.score), notes: r.notes ?? '' };
    overallNotes = r.overall_notes ?? '';
  }

  return (
    <ScoreForm
      project={project}
      eventName={event.name}
      criteria={criteria}
      initialScores={existing}
      initialOverallNotes={overallNotes}
      judgeName={judge.name}
    />
  );
}
