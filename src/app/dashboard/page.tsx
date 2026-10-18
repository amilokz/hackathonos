import { redirect } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizer } from '@/lib/require-organizer';
import OrganizerShell from '@/components/OrganizerShell';
import EmptyState from '@/components/EmptyState';
import EventCard from '@/components/EventCard';
import { Container, Card, PageHeader, LinkButton } from '@/components/ui';
import SeedDemoButton from './SeedDemoButton';
import InviteCodes from '@/components/InviteCodes';
import UpcomingDeadlines, {
  filterUpcomingDeadlines,
  type DeadlineEvent,
} from '@/components/dashboard/UpcomingDeadlines';
import RecentRegistrations, { type RecentTeam } from '@/components/dashboard/RecentRegistrations';
import DashboardPendingApprovals, {
  type DashboardPendingTeam,
} from '@/components/dashboard/PendingApprovals';
import LatestSubmissions, { type DashboardSubmission } from '@/components/dashboard/LatestSubmissions';
import ActivityFeed, { type ActivityEntry } from '@/components/dashboard/ActivityFeed';
import type { EventRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

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

async function getDashboardInsights(orgId: string): Promise<{
  deadlines: DeadlineEvent[];
  registrations: RecentTeam[];
  pendingTeams: DashboardPendingTeam[];
  submissions: DashboardSubmission[];
  activity: ActivityEntry[];
}> {
  const db = getDb();

  const deadlines = (await db
    .prepare(
      `SELECT id, name, end_date FROM events
       WHERE organizer_id = ? AND status = 'published'
         AND end_date IS NOT NULL AND TRIM(end_date) <> ''
       ORDER BY end_date ASC LIMIT 20`,
    )
    .all(orgId)) as DeadlineEvent[];

  const registrations = (await db
    .prepare(
      `SELECT t.id, t.name, t.event_id, e.name AS event_name, t.created_at
       FROM teams t JOIN events e ON e.id = t.event_id
       WHERE e.organizer_id = ?
       ORDER BY t.created_at DESC LIMIT 8`,
    )
    .all(orgId)) as RecentTeam[];

  const pendingTeams = (await db
    .prepare(
      `SELECT t.id, t.name, t.contact_name, t.contact_email, t.event_id, e.name AS event_name, t.created_at
       FROM teams t JOIN events e ON e.id = t.event_id
       WHERE e.organizer_id = ? AND t.approval_status = 'pending'
       ORDER BY t.created_at DESC LIMIT 12`,
    )
    .all(orgId)) as DashboardPendingTeam[];

  const submissions = (await db
    .prepare(
      `SELECT p.id, p.title, t.name AS team_name, t.event_id AS event_id, e.name AS event_name, p.created_at
       FROM projects p
       JOIN teams t ON t.id = p.team_id
       JOIN events e ON e.id = t.event_id
       WHERE e.organizer_id = ?
       ORDER BY p.created_at DESC LIMIT 8`,
    )
    .all(orgId)) as DashboardSubmission[];

  const activity = (await db
    .prepare(
      `SELECT a.id, a.type, a.message, a.created_at
       FROM activity_log a JOIN events e ON e.id = a.event_id
       WHERE e.organizer_id = ?
       ORDER BY a.created_at DESC LIMIT 15`,
    )
    .all(orgId)) as ActivityEntry[];

  return {
    deadlines: filterUpcomingDeadlines(deadlines),
    registrations,
    pendingTeams,
    submissions,
    activity,
  };
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

export default async function DashboardPage() {
  const org = await requireOrganizer();
  if (!org) redirect('/login');

  await migrate();
  const db = getDb();
  const events = (await db
    .prepare('SELECT * FROM events WHERE organizer_id = ? ORDER BY created_at DESC')
    .all(org.id)) as EventRow[];

  const stats = await getDashboardStats(org.id);
  const insights = await getDashboardInsights(org.id);
  const cardStats = new Map<string, EventCardStats>();
  for (const e of events) {
    cardStats.set(e.id, await getEventCardStats(e.id));
  }

  return (
    <OrganizerShell organizer={org} active="overview">
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

        {/* insight sections */}
        <section aria-label="Insights" className="mt-10">
          <div className="grid gap-4 lg:grid-cols-2">
            <UpcomingDeadlines events={insights.deadlines} viewAllHref="/dashboard#events" />
            <RecentRegistrations teams={insights.registrations} viewAllHref="/dashboard#events" />
            <DashboardPendingApprovals
              teams={insights.pendingTeams}
              viewAllHref={
                insights.pendingTeams[0]
                  ? `/dashboard/events/${insights.pendingTeams[0].event_id}#teams`
                  : '/dashboard#events'
              }
            />
            <LatestSubmissions projects={insights.submissions} viewAllHref="/dashboard#events" />
          </div>
          <div className="mt-4">
            <ActivityFeed entries={insights.activity} />
          </div>
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
              {events.map((e) => {
                const s = cardStats.get(e.id) ?? { approvedTeams: 0, pendingTeams: 0, projects: 0 };
                return (
                  <EventCard
                    key={e.id}
                    event={e}
                    teams={s.approvedTeams + s.pendingTeams}
                    projects={s.projects}
                    pendingTeams={s.pendingTeams}
                  />
                );
              })}
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

        {/* Organizer invite codes (security) */}
        <section aria-label="Invite codes" className="mt-8">
          <InviteCodes />
        </section>
      </Container>
    </OrganizerShell>
  );
}
