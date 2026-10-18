import { redirect } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizer } from '@/lib/require-organizer';
import { Container, Card, PageHeader, LinkButton, TopNav } from '@/components/ui';
import LogoutButton from './LogoutButton';
import QuickActions from '@/components/QuickActions';
import SeedDemoButton from './SeedDemoButton';
import type { EventRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  published: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-amber-100 text-amber-700',
};

interface EventStats {
  approvedTeams: number;
  pendingTeams: number;
  projects: number;
  judgingPct: number;
  judges: number;
}

async function getStats(eventId: string): Promise<EventStats> {
  const db = getDb();
  const approvedTeams = (await db
    .prepare("SELECT COUNT(*) AS c FROM teams WHERE event_id = ? AND approval_status = 'approved'")
    .get(eventId) as { c: number }).c;
  const pendingTeams = (await db
    .prepare("SELECT COUNT(*) AS c FROM teams WHERE event_id = ? AND approval_status = 'pending'")
    .get(eventId) as { c: number }).c;
  const projects = (await db
    .prepare("SELECT COUNT(*) AS c FROM projects WHERE team_id IN (SELECT id FROM teams WHERE event_id = ? AND approval_status = 'approved')")
    .get(eventId) as { c: number }).c;

  const judgeRows = (await db
    .prepare('SELECT COUNT(*) AS c FROM judges WHERE event_id = ?')
    .get(eventId) as { c: number }).c;
  const distinctScorers = (await db
    .prepare(
      `SELECT COUNT(DISTINCT s.judge_name) AS c FROM scores s
       JOIN projects p ON p.id = s.project_id
       JOIN teams t ON t.id = p.team_id
       WHERE t.event_id = ? AND t.approval_status = 'approved'`,
    )
    .get(eventId) as { c: number }).c;
  const judges = Math.max(judgeRows, distinctScorers);

  const completed = (await db
    .prepare(
      `SELECT COUNT(*) AS c FROM (
         SELECT DISTINCT s.project_id, s.judge_name FROM scores s
         JOIN projects p ON p.id = s.project_id
         JOIN teams t ON t.id = p.team_id
         WHERE t.event_id = ? AND t.approval_status = 'approved'
       )`,
    )
    .get(eventId) as { c: number }).c;
  const judgingPct = projects > 0 && judges > 0 ? Math.round((completed / (projects * judges)) * 100) : 0;

  return { approvedTeams, pendingTeams, projects, judgingPct, judges };
}

export default async function DashboardPage() {
  const org = await requireOrganizer();
  if (!org) redirect('/login');

  await migrate();
  const db = getDb();
  const events = await db
    .prepare('SELECT * FROM events WHERE organizer_id = ? ORDER BY created_at DESC')
    .all(org.id) as EventRow[];

  const stats = new Map<string, EventStats>();
  for (const e of events) {
    stats.set(e.id, await getStats(e.id));
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav title={org.name} right={<LogoutButton />} />
      <Container className="py-10">
        <PageHeader
          title="Your hackathons"
          subtitle={`${org.name} · ${org.email}`}
          action={<LinkButton href="/dashboard/events/new">+ New event</LinkButton>}
        />

        {events.length === 0 ? (
          <Card className="p-10 text-center sm:p-14">
            <p className="text-5xl" role="img" aria-label="Rocket">🚀</p>
            <p className="mt-4 text-lg font-semibold text-slate-900">No events yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              Create your first hackathon and share the public link with participants.
              Registrations, project submissions and judging are all handled for you.
            </p>
            <div className="mt-6">
              <LinkButton href="/dashboard/events/new">+ Create your first event</LinkButton>
            </div>
            <SeedDemoButton />
          </Card>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-semibold">Event</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Teams</th>
                  <th className="px-4 py-3 font-semibold">Projects</th>
                  <th className="px-4 py-3 font-semibold">Judging</th>
                  <th className="px-5 py-3 text-right font-semibold">Quick actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => {
                  const s = stats.get(e.id) ?? { approvedTeams: 0, pendingTeams: 0, projects: 0, judgingPct: 0, judges: 0 };
                  return (
                    <tr key={e.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                      <td className="px-5 py-4">
                        <a href={`/dashboard/events/${e.id}`} className="font-bold text-slate-900 hover:text-indigo-700">
                          {e.name}
                        </a>
                        <p className="mt-0.5 font-mono text-xs text-slate-400">/e/{e.slug}</p>
                        <div className="mt-1.5 flex gap-2">
                          <a href={`/dashboard/events/${e.id}`} className="text-xs font-semibold text-indigo-600 hover:underline">
                            Manage →
                          </a>
                          {(e.status === 'published' || e.status === 'closed') && (
                            <a href={`/e/${e.slug}`} className="text-xs font-semibold text-slate-500 hover:underline">
                              Public page
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[e.status] ?? STATUS_STYLES.draft}`}>
                          {e.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-bold text-slate-900">{s.approvedTeams}</span>
                        {s.pendingTeams > 0 && (
                          <a
                            href={`/dashboard/events/${e.id}#teams`}
                            className="ml-2 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 hover:bg-amber-200"
                            title="Teams awaiting approval"
                          >
                            {s.pendingTeams} pending
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-bold text-slate-900">{s.projects}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                              style={{ width: `${Math.min(100, s.judgingPct)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-600">{s.judgingPct}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end">
                          <QuickActions eventId={e.id} status={e.status} slug={e.slug} eventName={e.name} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        )}
      </Container>
    </div>
  );
}
