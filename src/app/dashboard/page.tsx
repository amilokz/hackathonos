import { redirect } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizer } from '@/lib/require-organizer';
import OrganizerShell from '@/components/OrganizerShell';
import EventCard from '@/components/EventCard';
import { Container, Card, LinkButton, StatCard, DsIcon } from '@/components/ui';
import EmptyState from '@/components/EmptyState';
import { DashIcon } from '@/components/dashboard/icons';
import DashboardGreeting from '@/components/dashboard/DashboardGreeting';
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

interface StatDelta {
  /** Percent change vs the previous 30-day window; null when not computable. Never fake. */
  pct: number | null;
}

interface DashboardStats {
  totalEvents: { value: number; delta: StatDelta };
  activeRegistrations: { value: number; delta: StatDelta };
  projectsSubmitted: { value: number; delta: StatDelta };
  certificatesIssued: { value: number; delta: StatDelta };
}

interface EventCardStats {
  approvedTeams: number;
  pendingTeams: number;
  projects: number;
}

/** Percent change of the trailing 30-day window vs the one before it. */
function windowDelta(recent: number, previous: number): StatDelta {
  if (previous <= 0) return { pct: null };
  return { pct: ((recent - previous) / previous) * 100 };
}

async function windowCount(
  currentSql: string,
  previousSql: string,
  organizerId: string,
): Promise<{ recent: number; previous: number }> {
  const db = getDb();
  const recent = ((await db.prepare(currentSql).get(organizerId)) as { c: number }).c;
  const previous = ((await db.prepare(previousSql).get(organizerId)) as { c: number }).c;
  return { recent, previous };
}

async function getDashboardStats(organizerId: string): Promise<DashboardStats> {
  const db = getDb();
  const in30 = `datetime(created_at) >= datetime('now', '-30 days')`;
  const prev30 = `datetime(created_at) >= datetime('now', '-60 days') AND datetime(created_at) < datetime('now', '-30 days')`;

  const count = async (sql: string) =>
    ((await db.prepare(sql).get(organizerId)) as { c: number }).c;

  const totalEvents = await count(
    'SELECT COUNT(*) AS c FROM events WHERE organizer_id = ?',
  );
  const activeRegistrations = await count(
    `SELECT COUNT(*) AS c FROM teams t
     JOIN events e ON e.id = t.event_id
     WHERE e.organizer_id = ? AND e.status = 'published' AND t.approval_status = 'approved'`,
  );
  const projectsSubmitted = await count(
    `SELECT COUNT(*) AS c FROM projects p
     JOIN teams t ON t.id = p.team_id
     JOIN events e ON e.id = t.event_id
     WHERE e.organizer_id = ? AND t.approval_status = 'approved'`,
  );
  const certificatesIssued = await count(
    `SELECT COUNT(*) AS c FROM certificates c
     JOIN events e ON e.id = c.event_id
     WHERE e.organizer_id = ?`,
  );

  const ev = await windowCount(
    `SELECT COUNT(*) AS c FROM events WHERE organizer_id = ? AND ${in30}`,
    `SELECT COUNT(*) AS c FROM events WHERE organizer_id = ? AND ${prev30}`,
    organizerId,
  );
  const reg = await windowCount(
    `SELECT COUNT(*) AS c FROM teams t
     JOIN events e ON e.id = t.event_id
     WHERE e.organizer_id = ? AND e.status = 'published' AND t.approval_status = 'approved' AND ${in30.replace('created_at', 't.created_at')}`,
    `SELECT COUNT(*) AS c FROM teams t
     JOIN events e ON e.id = t.event_id
     WHERE e.organizer_id = ? AND e.status = 'published' AND t.approval_status = 'approved' AND ${prev30.replace('created_at', 't.created_at')}`,
    organizerId,
  );
  const proj = await windowCount(
    `SELECT COUNT(*) AS c FROM projects p
     JOIN teams t ON t.id = p.team_id
     JOIN events e ON e.id = t.event_id
     WHERE e.organizer_id = ? AND t.approval_status = 'approved' AND ${in30.replace('created_at', 'p.created_at')}`,
    `SELECT COUNT(*) AS c FROM projects p
     JOIN teams t ON t.id = p.team_id
     JOIN events e ON e.id = t.event_id
     WHERE e.organizer_id = ? AND t.approval_status = 'approved' AND ${prev30.replace('created_at', 'p.created_at')}`,
    organizerId,
  );
  const cert = await windowCount(
    `SELECT COUNT(*) AS c FROM certificates c
     JOIN events e ON e.id = c.event_id
     WHERE e.organizer_id = ? AND ${in30.replace('created_at', 'c.created_at')}`,
    `SELECT COUNT(*) AS c FROM certificates c
     JOIN events e ON e.id = c.event_id
     WHERE e.organizer_id = ? AND ${prev30.replace('created_at', 'c.created_at')}`,
    organizerId,
  );

  return {
    totalEvents: { value: totalEvents, delta: windowDelta(ev.recent, ev.previous) },
    activeRegistrations: { value: activeRegistrations, delta: windowDelta(reg.recent, reg.previous) },
    projectsSubmitted: { value: projectsSubmitted, delta: windowDelta(proj.recent, proj.previous) },
    certificatesIssued: { value: certificatesIssued, delta: windowDelta(cert.recent, cert.previous) },
  };
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

interface SectionData<T> {
  items: T[];
  total: number;
}

async function getDashboardInsights(orgId: string): Promise<{
  deadlines: SectionData<DeadlineEvent>;
  registrations: SectionData<RecentTeam>;
  pendingTeams: SectionData<DashboardPendingTeam>;
  submissions: SectionData<DashboardSubmission>;
  activity: SectionData<ActivityEntry>;
}> {
  const db = getDb();
  const asCount = (v: unknown) => (v as { c: number }).c;

  const deadlineRows = (await db
    .prepare(
      `SELECT id, name, end_date FROM events
       WHERE organizer_id = ? AND status = 'published'
         AND end_date IS NOT NULL AND TRIM(end_date) <> ''
       ORDER BY end_date ASC`,
    )
    .all(orgId)) as DeadlineEvent[];
  const upcoming = filterUpcomingDeadlines(deadlineRows);
  const totalUpcoming = filterUpcomingDeadlines(deadlineRows, Number.MAX_SAFE_INTEGER).length;

  const registrations = (await db
    .prepare(
      `SELECT t.id, t.name, t.event_id, e.name AS event_name, t.created_at
       FROM teams t JOIN events e ON e.id = t.event_id
       WHERE e.organizer_id = ?
       ORDER BY t.created_at DESC LIMIT 8`,
    )
    .all(orgId)) as RecentTeam[];
  const totalRegistrations = asCount(
    await db
      .prepare(
        `SELECT COUNT(*) AS c FROM teams t JOIN events e ON e.id = t.event_id
         WHERE e.organizer_id = ?`,
      )
      .get(orgId),
  );

  const pendingTeams = (await db
    .prepare(
      `SELECT t.id, t.name, t.contact_name, t.contact_email, t.event_id, e.name AS event_name, t.created_at
       FROM teams t JOIN events e ON e.id = t.event_id
       WHERE e.organizer_id = ? AND t.approval_status = 'pending'
       ORDER BY t.created_at DESC LIMIT 12`,
    )
    .all(orgId)) as DashboardPendingTeam[];
  const totalPending = asCount(
    await db
      .prepare(
        `SELECT COUNT(*) AS c FROM teams t JOIN events e ON e.id = t.event_id
         WHERE e.organizer_id = ? AND t.approval_status = 'pending'`,
      )
      .get(orgId),
  );

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
  const totalSubmissions = asCount(
    await db
      .prepare(
        `SELECT COUNT(*) AS c FROM projects p
         JOIN teams t ON t.id = p.team_id
         JOIN events e ON e.id = t.event_id
         WHERE e.organizer_id = ?`,
      )
      .get(orgId),
  );

  const activity = (await db
    .prepare(
      `SELECT a.id, a.type, a.message, a.created_at
       FROM activity_log a JOIN events e ON e.id = a.event_id
       WHERE e.organizer_id = ?
       ORDER BY a.created_at DESC LIMIT 15`,
    )
    .all(orgId)) as ActivityEntry[];
  const totalActivity = asCount(
    await db
      .prepare(
        `SELECT COUNT(*) AS c FROM activity_log a JOIN events e ON e.id = a.event_id
         WHERE e.organizer_id = ?`,
      )
      .get(orgId),
  );

  return {
    deadlines: { items: upcoming, total: totalUpcoming },
    registrations: { items: registrations, total: totalRegistrations },
    pendingTeams: { items: pendingTeams, total: totalPending },
    submissions: { items: submissions, total: totalSubmissions },
    activity: { items: activity, total: totalActivity },
  };
}

/**
 * Delta badge props for the shared StatCard — only rendered when the
 * 30-day-vs-previous-30-day change is honestly computable (never faked).
 * deltaType carries the direction: green for growth, red for decline.
 */
function deltaProps(d: StatDelta): { delta?: string; deltaType?: 'up' | 'down' } {
  if (d.pct === null) return {};
  return {
    delta: `${d.pct >= 0 ? '+' : ''}${d.pct.toFixed(1)}%`,
    deltaType: d.pct >= 0 ? 'up' : 'down',
  };
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
      <Container className="py-6 sm:py-8">
        <DashboardGreeting name={org.name} />

        {/* stat tiles */}
        <section aria-label="Account statistics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total events"
            value={stats.totalEvents.value.toLocaleString()}
            {...deltaProps(stats.totalEvents.delta)}
            icon={<DsIcon name="calendar" />}
            iconTint="indigo"
            hint="Hackathons you've created"
          />
          <StatCard
            label="Active registrations"
            value={stats.activeRegistrations.value.toLocaleString()}
            {...deltaProps(stats.activeRegistrations.delta)}
            icon={<DsIcon name="users" />}
            iconTint="indigo"
            hint="Approved teams on published events"
          />
          <StatCard
            label="Projects submitted"
            value={stats.projectsSubmitted.value.toLocaleString()}
            {...deltaProps(stats.projectsSubmitted.delta)}
            icon={<DsIcon name="rocket" />}
            iconTint="emerald"
            hint="Across all your events"
          />
          <StatCard
            label="Certificates issued"
            value={stats.certificatesIssued.value.toLocaleString()}
            {...deltaProps(stats.certificatesIssued.delta)}
            icon={<DsIcon name="trophy" />}
            iconTint="amber"
            hint="QR-verified participant certificates"
          />
        </section>

        {/* insight sections */}
        <section aria-label="Insights" className="mt-8">
          <div className="grid gap-4 lg:grid-cols-2">
            <UpcomingDeadlines
              events={insights.deadlines.items}
              total={insights.deadlines.total}
              viewAllHref="/dashboard#events"
            />
            <RecentRegistrations
              teams={insights.registrations.items}
              total={insights.registrations.total}
              viewAllHref="/dashboard#events"
            />
            <DashboardPendingApprovals
              teams={insights.pendingTeams.items}
              total={insights.pendingTeams.total}
              viewAllHref={
                insights.pendingTeams.items[0]
                  ? `/dashboard/events/${insights.pendingTeams.items[0].event_id}#teams`
                  : '/dashboard#events'
              }
            />
            <LatestSubmissions
              projects={insights.submissions.items}
              total={insights.submissions.total}
              viewAllHref="/dashboard#events"
            />
          </div>
          <div className="mt-4">
            <ActivityFeed entries={insights.activity.items} total={insights.activity.total} />
          </div>
        </section>

        {/* events */}
        <section id="events" aria-label="Your events" className="mt-8 scroll-mt-24">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-slate-900">Your events</h2>
            {events.length > 0 && (
              <a
                href="/dashboard/events/new"
                className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 transition hover:text-indigo-800 hover:underline"
              >
                <DashIcon name="plus" className="h-3.5 w-3.5" />
                New event
              </a>
            )}
          </div>

          {events.length === 0 ? (
            <Card className="p-6 sm:p-10">
              <EmptyState
                icon={<DsIcon name="rocket" className="h-6 w-6" />}
                title="No events yet"
                text="Create your first hackathon and share the public link with participants. Registrations, project submissions and judging are all handled for you."
                action={<LinkButton href="/dashboard/events/new">Create your first event</LinkButton>}
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
                <span
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm"
                  aria-hidden="true"
                >
                  <DashIcon name="plus" className="h-7 w-7" />
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
