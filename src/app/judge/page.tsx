import { redirect } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { requireJudge } from '@/lib/judge-auth';
import { Container, PageHeader, Card, LinkButton } from '@/components/ui';

interface ProjectRow {
  id: string;
  title: string;
  description: string;
  demo_url: string;
  repo_url: string;
  team_name: string;
}

export default async function JudgeDashboardPage() {
  const judge = await requireJudge();
  if (!judge) redirect('/judge/login');

  await migrate();
  const db = getDb();

  const event = await db
    .prepare('SELECT id, name FROM events WHERE id = ?')
    .get(judge.event_id) as { id: string; name: string } | undefined;
  if (!event) redirect('/judge/login');

  const projects = (await db
    .prepare(
      `SELECT p.id, p.title, p.description, p.demo_url, p.repo_url, t.name AS team_name
       FROM projects p
       JOIN teams t ON t.id = p.team_id
       WHERE t.event_id = ? AND t.approval_status = 'approved'
       ORDER BY p.created_at`,
    )
    .all(judge.event_id)) as ProjectRow[];

  const criteria = (await db
    .prepare('SELECT id FROM criteria WHERE event_id = ?')
    .all(judge.event_id)) as { id: string }[];
  const totalCriteria = criteria.length;

  const scored = (await db
    .prepare(
      `SELECT s.project_id, COUNT(DISTINCT s.criteria_id) AS n
       FROM scores s
       JOIN projects p ON p.id = s.project_id
       JOIN teams t ON t.id = p.team_id
       WHERE t.event_id = ? AND s.judge_id = ?
       GROUP BY s.project_id`,
    )
    .all(judge.event_id, judge.id)) as { project_id: string; n: number }[];
  const scoredByProject = new Map(scored.map((r) => [r.project_id, Number(r.n)]));

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <Container className="flex h-16 items-center justify-between">
          <p className="text-lg font-extrabold tracking-tight text-slate-900">
            Hackathon<span className="text-indigo-600">OS</span>
            <span className="ml-2 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">
              Judge portal
            </span>
          </p>
          <p className="text-sm text-slate-500">
            Signed in as <span className="font-semibold text-slate-700">{judge.name}</span>
          </p>
        </Container>
      </header>

      <Container className="py-8">
        <PageHeader
          title={event.name}
          subtitle={`${projects.length} project${projects.length === 1 ? '' : 's'} to judge · ${totalCriteria} criteria each`}
        />

        {projects.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="font-semibold text-slate-700">No projects yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Approved team submissions will appear here once they come in.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((p) => {
              const done = scoredByProject.get(p.id) ?? 0;
              const complete = totalCriteria > 0 && done >= totalCriteria;
              return (
                <Card key={p.id} className="flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold text-slate-900">{p.title}</h2>
                      <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                        {p.team_name}
                      </p>
                    </div>
                    {complete ? (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        ✓ Scored
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                        {done}/{totalCriteria} scored
                      </span>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm text-slate-600">{p.description}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs font-medium">
                    {p.demo_url && (
                      <a href={p.demo_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                        Live demo ↗
                      </a>
                    )}
                    {p.repo_url && (
                      <a href={p.repo_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                        Repository ↗
                      </a>
                    )}
                  </div>
                  <div className="mt-4 pt-1">
                    <LinkButton href={`/judge/score/${p.id}`} variant={complete ? 'secondary' : 'primary'} className="w-full">
                      {complete ? 'Review scores' : 'Score this project'}
                    </LinkButton>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Container>
    </div>
  );
}
