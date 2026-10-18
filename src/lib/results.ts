import { getDb } from './db';

export interface ProjectResult {
  project_id: string;
  title: string;
  team_name: string;
  judges: number;
  /** Weighted human total, 0-100. Null when no human scores yet. */
  human_total: number | null;
  criterion_averages: { criterion: string; average: number; weight: number }[];
  ai_overall: number | null;
  rank: number;
}

/**
 * Ranked results for an event.
 * human_total = Σ(avg criterion score 0-10 × weight/100) × 10 → 0-100 scale.
 * AI overall is shown alongside but never mixed into the human total.
 * Only teams with approval_status='approved' contribute — pending/rejected
 * teams stay invisible on public leaderboards until approved.
 */
export async function computeResults(eventId: string): Promise<ProjectResult[]> {
  const db = getDb();

  const criteria = await db
    .prepare('SELECT id, name, weight FROM criteria WHERE event_id = ? ORDER BY rowid')
    .all(eventId) as { id: string; name: string; weight: number }[];

  const projects = await db
    .prepare(
      `SELECT p.id, p.title, t.name AS team_name
       FROM projects p JOIN teams t ON t.id = p.team_id
       WHERE t.event_id = ? AND t.approval_status = 'approved' ORDER BY p.created_at`
    )
    .all(eventId) as { id: string; title: string; team_name: string }[];

  const scores = await db
    .prepare(
      `SELECT s.project_id, s.criteria_id, s.score, s.judge_name
       FROM scores s
       JOIN projects p ON p.id = s.project_id
       JOIN teams t ON t.id = p.team_id
       WHERE t.event_id = ? AND t.approval_status = 'approved'`
    )
    .all(eventId) as { project_id: string; criteria_id: string; score: number; judge_name: string }[];

  const aiScores = await db
    .prepare(
      `SELECT a.project_id, a.overall
       FROM ai_scores a
       JOIN projects p ON p.id = a.project_id
       JOIN teams t ON t.id = p.team_id
       WHERE t.event_id = ? AND t.approval_status = 'approved'`
    )
    .all(eventId) as { project_id: string; overall: number }[];
  const aiByProject = new Map(aiScores.map((a) => [a.project_id, a.overall]));

  const totalWeight = criteria.reduce((n, c) => n + c.weight, 0);

  const results: ProjectResult[] = projects.map((p) => {
    const pScores = scores.filter((s) => s.project_id === p.id);
    const judges = new Set(pScores.map((s) => s.judge_name)).size;

    let human_total: number | null = null;
    const criterion_averages = criteria.map((c) => {
      const cs = pScores.filter((s) => s.criteria_id === c.id).map((s) => s.score);
      const average = cs.length ? cs.reduce((a, b) => a + b, 0) / cs.length : 0;
      return { criterion: c.name, average: Math.round(average * 100) / 100, weight: c.weight };
    });

    if (pScores.length > 0 && totalWeight > 0) {
      const weighted = criterion_averages.reduce((n, ca) => n + ca.average * (ca.weight / totalWeight), 0);
      human_total = Math.round(weighted * 10 * 100) / 100; // 0-100
    }

    return {
      project_id: p.id,
      title: p.title,
      team_name: p.team_name,
      judges,
      human_total,
      criterion_averages,
      ai_overall: aiByProject.get(p.id) ?? null,
      rank: 0,
    };
  });

  results.sort((a, b) => (b.human_total ?? -1) - (a.human_total ?? -1));
  results.forEach((r, i) => {
    r.rank = i + 1;
  });

  return results;
}
