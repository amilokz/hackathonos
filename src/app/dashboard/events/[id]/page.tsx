import { redirect, notFound } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizer, getOwnedEvent } from '@/lib/require-organizer';
import OrganizerShell from '@/components/OrganizerShell';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import EmptyState from '@/components/EmptyState';
import CopyButton from '@/components/CopyButton';
import { Container, Card } from '@/components/ui';
import EventForm from './EventForm';
import PublishToggle from '@/components/PublishToggle';
import QuickActions from '@/components/QuickActions';
import PendingApprovals from '@/components/PendingApprovals';
import TeamsTable from '@/components/TeamsTable';
import JudgesSection from '@/components/JudgesSection';
import AnnouncementsForm from '@/components/AnnouncementsForm';
import type { EventRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

const STATUS_PILL: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-800',
  published: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-200 text-slate-600',
};

function SidebarSection({ title, links }: { title: string; links: { href: string; label: string; desc: string }[] }) {
  return (
    <div>
      <p className="px-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">{title}</p>
      <ul className="mt-2 space-y-1">
        {links.map((l) => (
          <li key={l.label + l.href}>
            <a href={l.href} className="block rounded-xl px-3 py-2.5 transition hover:bg-indigo-50">
              <span className="font-semibold text-slate-800">{l.label}</span>
              <span className="block text-xs text-slate-400">{l.desc}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Inline quick links to the four main organizer destinations.
 * "Manage" points at the current page and renders as the active state.
 */
function QuickNavButtons({ eventId, slug }: { eventId: string; slug: string }) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition';
  const idle = 'border-slate-300 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700';
  return (
    <div className="flex flex-wrap gap-2">
      <span className={`${base} border-indigo-600 bg-indigo-600 text-white`} aria-current="page">
        ⚙️ Manage
      </span>
      <a href={`/dashboard/events/${eventId}/analytics`} className={`${base} ${idle}`}>
        📊 Analytics
      </a>
      <a href={`/dashboard/events/${eventId}/checkin`} className={`${base} ${idle}`}>
        📱 Check-in
      </a>
      <a href={`/e/${slug}/live`} target="_blank" rel="noreferrer" className={`${base} ${idle}`}>
        🖥️ Live screen
      </a>
    </div>
  );
}

export default async function ManageEventPage({ params }: { params: { id: string } }) {
  const org = await requireOrganizer();
  if (!org) redirect('/login');

  await migrate();
  const db = getDb();
  const event = (await getOwnedEvent(params.id, org.id)) as EventRow | null;
  if (!event) notFound();

  const teams = (await db.prepare('SELECT COUNT(*) AS c FROM teams WHERE event_id = ?').get(event.id) as { c: number }).c;
  const pendingTeams = (await db.prepare("SELECT COUNT(*) AS c FROM teams WHERE event_id = ? AND approval_status = 'pending'").get(event.id) as { c: number }).c;
  const projects = (await db.prepare(
    'SELECT COUNT(*) AS c FROM projects WHERE team_id IN (SELECT id FROM teams WHERE event_id = ?)',
  ).get(event.id) as { c: number }).c;
  const announcementCount = (await db.prepare('SELECT COUNT(*) AS c FROM announcements WHERE event_id = ?').get(event.id) as { c: number }).c;
  const criteria = await db.prepare('SELECT name, weight FROM criteria WHERE event_id = ? ORDER BY weight DESC').all(event.id) as { name: string; weight: number }[];

  const id = event.id;
  const setupLinks = [
    { href: '#basic-info', label: '📝 Basic information', desc: 'Name, dates, prizes, schedule' },
    { href: `/dashboard/events/${id}/sponsors`, label: '🤝 Sponsors', desc: 'Sponsor logos on the public page' },
    { href: '#judges', label: '🧑‍⚖️ Judges', desc: 'Judge access & assignments' },
    { href: `/dashboard/events/${id}/criteria`, label: '📋 Criteria', desc: 'Judging criteria & weights' },
    { href: `/dashboard/events/${id}/certificates`, label: '🎓 Certificates', desc: 'QR-verified participant certificates' },
    { href: `/dashboard/events/${id}/settings`, label: '⚙️ Settings', desc: 'Entry fees, approvals & white label' },
  ];
  const manageLinks = [
    { href: '#teams', label: `👥 Teams & applications${pendingTeams > 0 ? ` (${pendingTeams} pending)` : ''}`, desc: 'Approve registrations, manage members' },
    { href: `/dashboard/events/${id}/judging`, label: '⚖️ Projects & judging', desc: 'Score projects & see AI pre-scores' },
    { href: `/dashboard/events/${id}/checkin`, label: '✅ Check-in', desc: 'On-site QR team check-in' },
    { href: `/dashboard/events/${id}/announcements`, label: '📢 Announcements', desc: 'Broadcast messages, deadlines & winners' },
    { href: `/dashboard/events/${id}/analytics`, label: '📊 Analytics', desc: 'Mission Control live stats' },
  ];

  return (
    <OrganizerShell organizer={org} active="events">
      <Container className="py-8 sm:py-10">
        <Breadcrumbs
          items={[{ label: 'Dashboard', href: '/dashboard' }, { label: event.name }]}
        />

        {/* Summary bar */}
        <Card className="mb-6 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  {event.name}
                </h1>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                    STATUS_PILL[event.status] ?? STATUS_PILL.draft
                  }`}
                >
                  {event.status}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-slate-500">
                {teams} teams · {projects} projects
                {pendingTeams > 0 && (
                  <span className="ml-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                    {pendingTeams} awaiting approval
                  </span>
                )}
              </p>
              {(event.status === 'published' || event.status === 'closed') && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Public URL
                  </span>
                  <a
                    href={`/e/${event.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                  >
                    /e/{event.slug}
                  </a>
                  <CopyButton text={`/e/${event.slug}`} addOrigin label="⧉ Copy link" />
                </div>
              )}
            </div>
            <PublishToggle eventId={event.id} status={event.status} size="lg" />
          </div>
          <div className="mt-5 border-t border-slate-100 pt-5">
            <QuickNavButtons eventId={event.id} slug={event.slug} />
          </div>
        </Card>

        <Card
          className={`mb-6 flex flex-wrap items-center justify-between gap-4 p-5 ${
            event.status === 'published'
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <div>
            <p className="font-bold text-slate-900">
              Status: <span className="capitalize">{event.status}</span>
            </p>
            <p className="mt-0.5 text-sm text-slate-600">
              {event.status === 'published'
                ? 'Your event is live — participants can register and the public page is online.'
                : event.status === 'closed'
                  ? 'This hackathon has ended — the public page and leaderboard stay live with the final results.'
                  : 'Your event is not public yet. Publish it to activate the public page and registrations.'}
            </p>
          </div>
        </Card>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Left sidebar */}
          <aside className="w-full shrink-0 lg:sticky lg:top-20 lg:w-64">
            <Card className="space-y-6 p-4">
              <SidebarSection title="Setup" links={setupLinks} />
              <SidebarSection title="Manage" links={manageLinks} />
            </Card>
          </aside>

          {/* Main content */}
          <div className="min-w-0 flex-1 space-y-6">
            <section id="basic-info" className="scroll-mt-24">
              <EventForm event={event} />
            </section>

            <Card className="p-5">
              <h2 className="font-bold text-slate-900">Judging criteria</h2>
              <p className="mt-0.5 text-xs text-slate-400">Auto-created with the event.</p>
              {criteria.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  No criteria yet —{' '}
                  <a href={`/dashboard/events/${event.id}/criteria`} className="font-semibold text-indigo-600 hover:underline">
                    add some
                  </a>
                  .
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {criteria.map((c) => (
                    <li key={c.name} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">{c.name}</span>
                      <span className="font-semibold text-slate-900">{c.weight}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <div id="judges" className="scroll-mt-24">
              <JudgesSection eventId={event.id} />
            </div>

            <section id="teams" className="scroll-mt-24">
              <Card className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold text-slate-900">Teams & applications</h2>
                  {pendingTeams > 0 && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                      {pendingTeams} awaiting approval
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Approve pending registrations, or reject them. Pending teams stay invisible
                  everywhere public until approved.
                </p>
                <div className="mt-4">
                  <PendingApprovals eventId={event.id} />
                </div>
                <div className="mt-6">
                  <h3 className="mb-2 font-semibold text-slate-900">All teams</h3>
                  <TeamsTable eventId={event.id} />
                </div>
              </Card>
            </section>

            <section id="announcements" className="scroll-mt-24">
              {announcementCount === 0 ? (
                <Card className="p-5 sm:p-6">
                  <h2 className="text-lg font-bold text-slate-900">📢 Announcements</h2>
                  <EmptyState
                    icon="📢"
                    title="No announcements yet"
                    description="Post deadlines, reminders and winner announcements — they appear on the live screen within seconds."
                    actionLabel="Go to announcements"
                    actionHref={`/dashboard/events/${event.id}/announcements`}
                    compact
                  />
                </Card>
              ) : (
                <AnnouncementsForm eventId={event.id} />
              )}
            </section>

            <Card className="p-5">
              <h2 className="font-bold text-slate-900">Quick actions</h2>
              <p className="mt-0.5 text-xs text-slate-400">Publish, close, duplicate or delete this event.</p>
              <div className="mt-3">
                <QuickActions eventId={event.id} status={event.status} slug={event.slug} eventName={event.name} />
              </div>
            </Card>
          </div>
        </div>
      </Container>
    </OrganizerShell>
  );
}
