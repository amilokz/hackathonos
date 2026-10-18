import { redirect, notFound } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizer, getOwnedEvent } from '@/lib/require-organizer';
import OrganizerShell from '@/components/OrganizerShell';
import EmptyState from '@/components/EmptyState';
import { Container, Card, LinkButton } from '@/components/ui';
import { PageHeader, DsIcon } from '@/components/design-system';
import CheckinClient from './CheckinClient';
import PassLinksTable, { type TeamPass } from './PassLinksTable';
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

  const passes: TeamPass[] = teams.map((t) => {
    const code = (t.checkin_code ?? '').trim();
    return {
      id: t.id,
      name: t.name,
      code,
      passUrl: code
        ? `/e/${event.slug}/pass/${t.id}?code=${encodeURIComponent(code)}`
        : `/e/${event.slug}/pass/${t.id}`,
    };
  });

  return (
    <OrganizerShell organizer={org} active="events" eventContext={{ id: event.id, slug: event.slug }}>
      <Container className="py-6 sm:py-8">
        <PageHeader
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: event.name, href: `/dashboard/events/${event.id}` },
            { label: 'Check-in' },
          ]}
          title="QR Check-in"
          subtitle="Scan team passes at the door — each member checks in once."
        />
        <CheckinClient eventId={event.id} organizerName={org.name} />

        <Card className="mt-6 p-5 sm:p-6">
          <h2 className="text-lg font-bold text-slate-900">Team pass links</h2>
          <p className="mt-1 text-sm text-slate-500">
            Codes are created the first time a pass link is opened. Share each link with the team —
            the code is only required on first visit.
          </p>
          <div className="mt-4">
            {passes.length === 0 ? (
              <EmptyState
                icon={<DsIcon name="ticket" className="h-6 w-6" />}
                title="No teams yet"
                description="Pass links appear here once teams register for this event. Share the public registration link to get started."
                action={
                  <LinkButton href={`/dashboard/events/${event.id}`} variant="secondary">
                    Back to manage
                  </LinkButton>
                }
                compact
              />
            ) : (
              <PassLinksTable passes={passes} />
            )}
          </div>
        </Card>
      </Container>
    </OrganizerShell>
  );
}
