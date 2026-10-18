import { redirect } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizer } from '@/lib/require-organizer';
import OrganizerShell from '@/components/OrganizerShell';
import EmptyState from '@/components/EmptyState';
import { Container, Card, PageHeader, LinkButton } from '@/components/ui';
import SeedDemoButton from './SeedDemoButton';
import type { EventRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-800',
  published: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-200 text-slate-600',
};

interface DashboardStats {
  totalEvents: number;
  activeRegistrations: number;
  projectsSubmitted: number;
  certificatesIssued: number;
}

interface EventCardStats {
  approvedTeams: number;
  pendingTeams: number;
  projects: number;
}

async function getDashboardStats(organizerId: string): Promise<DashboardStats> {
  const db = getDb();
  const totalEvents = (
    (await db
      .prepare('SELECT COUNT(*) AS c FROM events WHERE organizer_id = ?')
      .get(organizerId)) as { c: number }
  ).c;
  const activeRegistrations = (
    (await db
      .prepare(
        `SELECT COUNT(*) AS c FROM teams t
         JOIN events e ON e.id = t.event_id
         WHERE e.organizer_id = ? AND e.status = 'published' AND t.approval_status = 'approved'`,
      )
      .get(organizerId)) as { c: number }
  ).c;
  const projectsSubmitted = (
    (await db
      .prepare(
        `SELECT COUNT(*) AS c FROM projects p
         JOIN teams t ON t.id = p.team_id
         JOIN events e ON e.id = t.event_id
         WHERE e.organizer_id = ? AND t.approval_status = 'approved'`,
      )
      .get(organizerId)) as { c: number }
  ).c;
  const certificatesIssued = (
    (await db
      .prepare(
        `SELECT COUNT(*) AS c FROM certificates c
         JOIN events e ON e.id = c.event_id
         WHERE e.organizer_id = ?`,
      )
      .get(organizerId)) as { c: number }
  ).c;
  return { totalEvents, activeRegistrations, projectsSubmitted, certificatesIssued };
}

async function getEventCardStats(eventId: string): Promise<EventCardStats> {
  const db = getDb();
  const approvedTeams = (
    (await db
      .prepare("SELECT COUNT(*) AS c FROM teams WHERE event_id = ? AND approval_status = 'approved'")
      .get(eventId)) as { c: number }
  ).c;
  const pendingTeams = (
    (await db
      .prepare("SELECT COUNT(*) AS c FROM teams WHERE event_id = ? AND approval_status = 'pending'")
      .get(eventId)) as { c: number }
  ).c;
  const projects = (
    (await db
      .prepare(
        "SELECT COUNT(*) AS c FROM projects WHERE team_id IN (SELECT id FROM teams WHERE event_id = ? AND approval_status = 'approved')",
      )
      .get(eventId)) as { c: number }
  ).c;
  return { approvedTeams, pendingTeams, projects };
}

function StatTile({ icon, label, value, hint }: { icon: string; label: string; value: number; hint: string }) {
  return (
    <Card className="p-5 transition hover:shadow-md">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-2xl" aria-hidden="true">
          {icon}
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
          <p className="text-3xl font-extrabold text-slate-900">{value.toLocaleString()}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{hint}</p>
    </Card>
  );
}

function EventCard({ event, stats }: { event: EventRow; stats: EventCardStats }) {
  const cover = (event.cover_url ?? '').trim() || (event.logo_url ?? '').trim();
  const actionBtn =
    'inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition';
  return (
    <Card className="flex flex-col overflow-hidden transition hover:shadow-lg">
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt={`${event.name} cover`} className="h-36 w-full object-cover" />
      ) : (
        <div
          className="flex h-36 w-full items-center justify-center bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800"
          aria-hidden="true"
        >
          <span className="px-4 text-center text-2xl font-extrabold tracking-tight text-white/90">
            {event.name}
          </span>
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-bold text-slate-900">{event.name}</h3>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
              STATUS_STYLES[event.status] ?? STATUS_STYLES.draft
            }`}
          >
            {event.status}
          </span>
        </div>
        <p className="mt-1 font-mono text-xs text-slate-400">/e/{event.slug}</p>
        <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
          <span>
            👥 <strong className="text-slate-900">{stats.approvedTeams}</strong> teams
          </span>
          <span>
            🚀 <strong className="text-slate-900">{stats.projects}</strong> projects
          </span>
          {stats.pendingTeams > 0 && (
            <a
              href={`/dashboard/events/${event.id}#teams`}
              className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 transition hover:bg-amber-200"
              title="Teams awaiting approval"
            >
              {stats.pendingTeams} pending
            </a>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a
            href={`/dashboard/events/${event.id}`}
            className={`${actionBtn} border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700`}
          >
            ⚙️ Manage
          </a>
          <a
            href={`/dashboard/events/${event.id}/analytics`}
            className={`${actionBtn} border-slate-300 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700`}
          >
            📊 Analytics
          </a>
          <a
            href={`/dashboard/events/${event.id}/checkin`}
            className={`${actionBtn} border-slate-300 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700`}
          >
            📱 Check-in
          </a>
          <a
            href={`/e/${event.slug}/live`}
            target="_blank"
            rel="noreferrer"
            className={`${actionBtn} border-slate-300 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700`}
          >
            🖥️ Live screen
          </a>
        </div>
      </div>
    </Card>
  );
}

export default async function DashboardPage() {
  const org = await requireOrganizer();
  if (!org) redirect('/login');

  await migrate();
  const db = getDb();
  const events = (await db
    .prepare('SELECT * FROM events WHERE organizer_id = ? ORDER BY created_at DESC')
    .all(org.id)) as EventRow[];

  const stats = await getDashboardStats(org.id);
  const cardStats = new Map<string, EventCardStats>();
  for (const e of events) {
    cardStats.set(e.id, await getEventCardStats(e.id));
  }

  return (
    <OrganizerShell organizer={org} active="dashboard">
      <Container className="py-8 sm:py-10">
        <PageHeader
          title="Welcome back 👋"
          subtitle={org.email}
          action={<LinkButton href="/dashboard/events/new">➕ New event</LinkButton>}
        />

        {/* stat tiles */}
        <section aria-label="Account statistics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile icon="📅" label="Total events" value={stats.totalEvents} hint="Hackathons you've created" />
          <StatTile
            icon="👥"
            label="Active registrations"
            value={stats.activeRegistrations}
            hint="Approved teams on published events"
          />
          <StatTile
            icon="🚀"
            label="Projects submitted"
            value={stats.projectsSubmitted}
            hint="Across all your events"
          />
          <StatTile
            icon="🎓"
            label="Certificates issued"
            value={stats.certificatesIssued}
            hint="QR-verified participant certificates"
          />
        </section>

        {/* events */}
        <section id="events" aria-label="Your events" className="mt-10 scroll-mt-24">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Your events</h2>
            {events.length > 0 && (
              <a
                href="/dashboard/events/new"
                className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-800 hover:underline"
              >
                ➕ New event
              </a>
            )}
          </div>

          {events.length === 0 ? (
            <Card className="p-6 sm:p-10">
              <EmptyState
                icon="🚀"
                title="No events yet"
                description="Create your first hackathon and share the public link with participants. Registrations, project submissions and judging are all handled for you."
                actionLabel="➕ Create your first event"
                actionHref="/dashboard/events/new"
              />
              <div className="flex justify-center">
                <SeedDemoButton />
              </div>
            </Card>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {events.map((e) => (
                <EventCard
                  key={e.id}
                  event={e}
                  stats={
                    cardStats.get(e.id) ?? { approvedTeams: 0, pendingTeams: 0, projects: 0 }
                  }
                />
              ))}
              {/* New event card */}
              <a
                href="/dashboard/events/new"
                className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-300 bg-indigo-50/40 p-6 text-center transition hover:border-indigo-500 hover:bg-indigo-50"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-3xl text-white shadow-sm" aria-hidden="true">
                  ➕
                </span>
                <p className="mt-4 text-lg font-bold text-slate-900">New event</p>
                <p className="mt-1 max-w-[220px] text-sm text-slate-500">
                  Start another hackathon — takes under a minute.
                </p>
              </a>
            </div>
          )}
        </section>
      </Container>
    </OrganizerShell>
  );
}
