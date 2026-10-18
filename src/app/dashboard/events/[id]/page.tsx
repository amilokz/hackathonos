import { redirect, notFound } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizer, getOwnedEvent } from '@/lib/require-organizer';
import { Container, Card, PageHeader, TopNav, LinkButton } from '@/components/ui';
import LogoutButton from '../../LogoutButton';
import EventForm from './EventForm';
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
        <PageHeader
          title={event.name}
          subtitle={`${teams} teams · ${projects} projects`}
          action={
            event.status === 'published' ? (
              <LinkButton href={`/e/${event.slug}`} variant="secondary">View public page</LinkButton>
            ) : undefined
          }
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <EventForm event={event} />
          </div>
          <div className="space-y-6">
            <Card className="p-5">
              <h2 className="font-bold text-slate-900">Judging criteria</h2>
              <p className="mt-0.5 text-xs text-slate-400">Auto-created with the event.</p>
              <ul className="mt-3 space-y-2">
                {criteria.map((c) => (
                  <li key={c.name} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{c.name}</span>
                    <span className="font-semibold text-slate-900">{c.weight}%</span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="p-5">
              <h2 className="font-bold text-slate-900">Quick links</h2>
              {event.status === 'published' ? (
                <ul className="mt-3 space-y-2 text-sm">
                  <li><a className="text-indigo-600 hover:underline" href={`/e/${event.slug}/leaderboard`}>Leaderboard (public)</a></li>
                  <li><a className="text-indigo-600 hover:underline" href={`/e/${event.slug}/register`}>Team registration (public)</a></li>
                  <li><a className="text-indigo-600 hover:underline" href={`/e/${event.slug}/submit`}>Project submission (public)</a></li>
                </ul>
              ) : (
                <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  ⚠️ Event is in <strong>Draft</strong> — public links are disabled. Set Status to <strong>Published</strong> above and save to activate them.
                </p>
              )}
            </Card>
          </div>
        </div>
      </Container>
    </div>
  );
}
