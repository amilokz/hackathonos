import { redirect } from 'next/navigation';
import { requireOrganizer, getOwnedEvent } from '@/lib/require-organizer';
import { getDb, migrate } from '@/lib/db';
import { ensureAnnouncementColumns } from '@/lib/announcement-columns';
import { Container, LinkButton } from '@/components/ui';
import { PageHeader, DsIcon } from '@/components/design-system';
import OrganizerShell from '@/components/OrganizerShell';

import AnnouncementsForm from '@/components/AnnouncementsForm';

export const dynamic = 'force-dynamic';

export default async function EventAnnouncementsPage({ params }: { params: { id: string } }) {
  await migrate();
  await ensureAnnouncementColumns();
  const organizer = await requireOrganizer();
  if (!organizer) redirect('/login');
  const event = await getOwnedEvent(params.id, organizer.id);
  if (!event) redirect('/dashboard');

  const db = getDb();
  const count = (
    (await db.prepare('SELECT COUNT(*) AS c FROM announcements WHERE event_id = ?').get(event.id)) as {
      c: number;
    }
  ).c;

  return (
    <OrganizerShell organizer={organizer} active="events" eventContext={{ id: event.id, slug: event.slug }}>
      <Container className="max-w-3xl py-6 sm:py-8">
        <PageHeader
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: event.name, href: `/dashboard/events/${params.id}` },
            { label: 'Announcements' },
          ]}
          title="Announcements"
          subtitle={`${event.name} · ${count} total — pinned first, then newest`}
          actions={
            <>
              <a
                href="#post"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                <DsIcon name="plus" className="h-4 w-4" />
                New announcement
              </a>
              <LinkButton href={`/dashboard/events/${params.id}`} variant="secondary">
                Back to event
              </LinkButton>
            </>
          }
        />
        <AnnouncementsForm eventId={params.id} />
      </Container>
    </OrganizerShell>
  );
}
