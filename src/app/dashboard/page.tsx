import { redirect } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizer } from '@/lib/require-organizer';
import { Container, Card, PageHeader, LinkButton, TopNav } from '@/components/ui';
import LogoutButton from './LogoutButton';
import PublishToggle from '@/components/PublishToggle';
import SeedDemoButton from './SeedDemoButton';
import type { EventRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  published: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-amber-100 text-amber-700',
};

export default async function DashboardPage() {
  const org = await requireOrganizer();
  if (!org) redirect('/login');

  await migrate();
  const db = getDb();
  const events = await db
    .prepare('SELECT * FROM events WHERE organizer_id = ? ORDER BY created_at DESC')
    .all(org.id) as EventRow[];

  const counts = new Map<string, { teams: number; projects: number }>();
  for (const e of events) {
    const teams = (await db.prepare('SELECT COUNT(*) AS c FROM teams WHERE event_id = ?').get(e.id) as { c: number }).c;
    const projects = (await db.prepare('SELECT COUNT(*) AS c FROM projects WHERE team_id IN (SELECT id FROM teams WHERE event_id = ?)').get(e.id) as { c: number }).c;
    counts.set(e.id, { teams, projects });
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
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => {
              const c = counts.get(e.id) ?? { teams: 0, projects: 0 };
              return (
                <Card key={e.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-bold text-slate-900">{e.name}</h2>
                      <p className="mt-0.5 font-mono text-xs text-slate-400">/e/{e.slug}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[e.status] ?? STATUS_STYLES.draft}`}>
                      {e.status}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-4 text-sm text-slate-500">
                    <span><strong className="text-slate-900">{c.teams}</strong> teams</span>
                    <span><strong className="text-slate-900">{c.projects}</strong> projects</span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <LinkButton href={`/dashboard/events/${e.id}`} variant="secondary">Manage</LinkButton>
                    <PublishToggle eventId={e.id} status={e.status} size="sm" />
                    {e.status === 'published' || e.status === 'closed' ? (
                      <LinkButton href={`/e/${e.slug}`} variant="secondary">View public page</LinkButton>
                    ) : null}
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
