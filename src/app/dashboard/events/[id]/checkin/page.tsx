import { redirect, notFound } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizer, getOwnedEvent } from '@/lib/require-organizer';
import { Container, Card, PageHeader, TopNav, Breadcrumb } from '@/components/ui';
import LogoutButton from '../../../LogoutButton';
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
    <div className="min-h-screen bg-slate-50">
      <TopNav title={org.name} right={<LogoutButton />} />
      <Container className="py-10">
        <Breadcrumb
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

        {teams.length > 0 && (
          <Card className="mt-6 p-5">
            <h2 className="font-bold text-slate-900">Team pass links</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Codes are created the first time a pass link is opened. Share each link with the team —
              the code is only required on first visit.
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {teams.map((t) => {
                const code = (t.checkin_code ?? '').trim();
                const passUrl = code
                  ? `/e/${event.slug}/pass/${t.id}?code=${encodeURIComponent(code)}`
                  : `/e/${event.slug}/pass/${t.id}`;
                return (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-4 py-2.5"
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
          </Card>
        )}
      </Container>
    </div>
  );
}
