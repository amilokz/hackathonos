import { redirect, notFound } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizer, getOwnedEvent } from '@/lib/require-organizer';
import { Container, Card, PageHeader, TopNav, LinkButton, Breadcrumb } from '@/components/ui';
import LogoutButton from '../../LogoutButton';
import EventForm from './EventForm';
import PublishToggle from '@/components/PublishToggle';
import QuickLinks from './QuickLinks';
import type { EventRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ManageEventPage({ params }: { params: { id: string } }) {
  const org = await requireOrganizer();
  if (!org) redirect('/login');

  await migrate();
  const db = getDb();
  const event = await getOwnedEvent(params.id, org.id) as EventRow | null;
  if (!event) notFound();

  const teams = (await db.prepare('SELECT COUNT(*) AS c FROM teams WHERE event_id = ?').get(event.id) as { c: number }).c;
  const projects = (await db.prepare(
    'SELECT COUNT(*) AS c FROM projects WHERE team_id IN (SELECT id FROM teams WHERE event_id = ?)',
  ).get(event.id) as { c: number }).c;
  const criteria = await db.prepare('SELECT name, weight FROM criteria WHERE event_id = ? ORDER BY weight DESC').all(event.id) as { name: string; weight: number }[];

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav title={org.name} right={<LogoutButton />} />
      <Container className="py-10">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: event.name }]} />
        <PageHeader
          title={event.name}
          subtitle={`${teams} teams · ${projects} projects`}
          action={
            event.status === 'published' || event.status === 'closed' ? (
              <LinkButton href={`/e/${event.slug}`} variant="secondary">View public page</LinkButton>
            ) : undefined
          }
        />

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
          <PublishToggle eventId={event.id} status={event.status} size="lg" />
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <EventForm event={event} />
          </div>
          <div className="space-y-6">
            <Card className="p-5">
              <h2 className="font-bold text-slate-900">Manage</h2>
              <ul className="mt-3 space-y-1 text-sm">
                {[
                  { href: `/dashboard/events/${event.id}/judging`, label: '⚖️ Judging', desc: 'Score projects & see AI pre-scores' },
                  { href: `/dashboard/events/${event.id}/criteria`, label: '📋 Criteria', desc: 'Judging criteria & weights' },
                  { href: `/dashboard/events/${event.id}/sponsors`, label: '🤝 Sponsors', desc: 'Sponsor logos on the public page' },
                  { href: `/dashboard/events/${event.id}/certificates`, label: '🎓 Certificates', desc: 'QR-verified participant certificates' },
                  { href: `/dashboard/events/${event.id}/settings`, label: '⚙️ Settings', desc: 'Entry fees, payments & white label' },
                ].map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      className="block rounded-xl px-3 py-2.5 transition hover:bg-indigo-50"
                    >
                      <span className="font-semibold text-slate-800">{l.label}</span>
                      <span className="block text-xs text-slate-400">{l.desc}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
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
            <Card className="p-5">
              <h2 className="font-bold text-slate-900">Quick links</h2>
              <QuickLinks slug={event.slug} status={event.status} />
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
}
