import { redirect } from 'next/navigation';
import { requireOrganizer, getOwnedEvent } from '@/lib/require-organizer';
import { getDb, migrate } from '@/lib/db';
import { ensureAnnouncementColumns } from '@/lib/announcement-columns';
import { Container, PageHeader, TopNav, LinkButton, Breadcrumb } from '@/components/ui';
import LogoutButton from '../../../LogoutButton';
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
    <div className="min-h-screen bg-slate-50">
      <TopNav title={organizer.name} right={<LogoutButton />} />
      <Container className="max-w-3xl py-10">
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: event.name, href: `/dashboard/events/${params.id}` },
            { label: 'Announcements' },
          ]}
        />
        <PageHeader
          title="📢 Announcements"
          subtitle={`${event.name} · ${count} total — pinned first, then newest`}
          action={
            <LinkButton href={`/dashboard/events/${params.id}`} variant="secondary">
              ← Back to event
            </LinkButton>
          }
        />
        <AnnouncementsForm eventId={params.id} />
      </Container>
    </div>
  );
}
