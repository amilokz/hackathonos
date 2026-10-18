import { redirect, notFound } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizer, getOwnedEvent } from '@/lib/require-organizer';
import OrganizerShell from '@/components/OrganizerShell';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import EmptyState from '@/components/EmptyState';
import { Container, Card, PageHeader } from '@/components/ui';
import CheckinClient from './CheckinClient';
import type { EventRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function CheckinPage({ params }: { params: { id: string } }) {
  const org = await requireOrganizer();
  if (!org) redirect('/login');

  await migrate();
  const db = getDb();
  const event = (await getOwnedEvent(params.id, org.id)) as EventRow | null;
  if (!event) notFound();

  const teams = (await db
    .prepare('SELECT id, name, checkin_code FROM teams WHERE event_id = ? ORDER BY name ASC')
    .all(event.id)) as Array<{ id: string; name: string; checkin_code: string }>;

  return (
    <OrganizerShell organizer={org} active="events">
      <Container className="py-8 sm:py-10">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: event.name, href: `/dashboard/events/${event.id}` },
            { label: 'Check-in' },
          ]}
        />
        <PageHeader
          title="✅ QR Check-in"
          subtitle="Scan team passes at the door — each member checks in once."
        />
        <CheckinClient eventId={event.id} organizerName={org.name} />

        <Card className="mt-6 p-5 sm:p-6">
          <h2 className="font-bold text-slate-900">Team pass links</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Codes are created the first time a pass link is opened. Share each link with the team —
            the code is only required on first visit.
          </p>
          {teams.length === 0 ? (
            <EmptyState
              icon="🎫"
              title="No teams yet"
              description="Pass links appear here once teams register for this event. Share the public registration link to get started."
              actionLabel="⚙️ Back to manage"
              actionHref={`/dashboard/events/${event.id}`}
              compact
            />
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {teams.map((t) => {
                const code = (t.checkin_code ?? '').trim();
                const passUrl = code
                  ? `/e/${event.slug}/pass/${t.id}?code=${encodeURIComponent(code)}`
                  : `/e/${event.slug}/pass/${t.id}`;
                return (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-4 py-2.5 transition hover:border-indigo-200"
                  >
                    <span className="font-semibold text-slate-800">{t.name}</span>
                    <a
                      href={passUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs font-bold text-indigo-600 hover:underline"
                    >
                      {code ? `Pass link · ${code}` : 'Open pass link'}
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </Container>
    </OrganizerShell>
  );
}
