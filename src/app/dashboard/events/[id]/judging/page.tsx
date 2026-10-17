import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { requireOrganizer, getOwnedEvent } from '@/lib/require-organizer';
import JudgingBoard from './JudgingBoard';

export default async function JudgingPage({ params }: { params: { id: string } }) {
  const org = await requireOrganizer();
  if (!org) redirect('/login');
  const event = await getOwnedEvent(params.id, org.id);
  if (!event) redirect('/dashboard');

  const db = getDb();

  const criteria = await db
    .prepare('SELECT id, name, weight, description FROM criteria WHERE event_id = ? ORDER BY rowid')
    .all(params.id);

  const projects = await db
    .prepare(
      `SELECT p.id, p.title, p.description, p.demo_url, p.repo_url, p.pitch_text, t.name AS team_name
       FROM projects p JOIN teams t ON t.id = p.team_id
       WHERE t.event_id = ? ORDER BY p.created_at`
    )
    .all(params.id);

  const scoreRows = await db
    .prepare(
      `SELECT s.project_id, s.judge_name, s.criteria_id, s.score, s.notes
       FROM scores s
       JOIN projects p ON p.id = s.project_id
       JOIN teams t ON t.id = p.team_id
       WHERE t.event_id = ?`
    )
    .all(params.id) as { project_id: string; judge_name: string; criteria_id: string; score: number; notes: string }[];

  const aiRows = await db
    .prepare(
      `SELECT a.project_id, a.overall, a.breakdown_json, a.strengths, a.weaknesses, a.questions
       FROM ai_scores a
       JOIN projects p ON p.id = a.project_id
       JOIN teams t ON t.id = p.team_id
       WHERE t.event_id = ?`
    )
    .all(params.id) as {
    project_id: string;
    overall: number;
    breakdown_json: string;
    strengths: string;
    weaknesses: string;
    questions: string;
  }[];

  const scoresByProject: Record<string, typeof scoreRows> = {};
  for (const s of scoreRows) {
    (scoresByProject[s.project_id] ||= []).push(s);
  }

  const aiByProject: Record<string, unknown> = {};
  for (const a of aiRows) {
    const parse = (v: string) => {
      try {
        return JSON.parse(v || '[]');
      } catch {
        return [];
      }
    };
    aiByProject[a.project_id] = {
      overall: a.overall,
      breakdown: parse(a.breakdown_json),
      strengths: parse(a.strengths),
      weaknesses: parse(a.weaknesses),
      questions: parse(a.questions),
    };
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto pt-6 px-6 flex items-center justify-between">
        <div>
          <a href={`/dashboard/events/${params.id}`} className="text-sm text-blue-600 hover:underline">
            ← Back to {event.name}
          </a>
          <h1 className="text-2xl font-bold mt-1">Judging</h1>
        </div>
        <a
          href={`/e/${event.slug}/leaderboard`}
          target="_blank"
          rel="noreferrer"
          className="text-sm px-4 py-2 border rounded hover:bg-white"
        >
          View public leaderboard ↗
        </a>
      </div>
      <JudgingBoard
        eventId={params.id}
        criteria={criteria as never}
        projects={projects as never}
        initialScores={scoresByProject}
        initialAi={aiByProject as never}
      />
    </div>
  );
}
