import { redirect } from 'next/navigation';
import { requireOrganizer, getOwnedEvent } from '@/lib/require-organizer';
import { migrate } from '@/lib/db';
import OrganizerShell from '@/components/OrganizerShell';
import { Container, LinkButton } from '@/components/ui';
import { PageHeader, DsIcon } from '@/components/design-system';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({ params }: { params: { id: string } }) {
  await migrate();
  const organizer = await requireOrganizer();
  if (!organizer) redirect('/login');
  const event = await getOwnedEvent(params.id, organizer.id);
  if (!event) redirect('/dashboard');

  return (
    <OrganizerShell organizer={organizer} active="settings" eventContext={{ id: event.id, slug: event.slug }}>
      <Container className="max-w-3xl py-6 sm:py-8">
        <PageHeader
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: event.name, href: `/dashboard/events/${params.id}` },
            { label: 'Settings' },
          ]}
          title="Event settings"
          subtitle={`${event.name} · entry fees, payments and white-label branding`}
          actions={
            <LinkButton href={`/dashboard/events/${params.id}`} variant="secondary">
              <DsIcon name="chevronLeft" className="h-4 w-4" />
              Back to event
            </LinkButton>
          }
        />
        <SettingsClient eventId={params.id} eventName={event.name} />
      </Container>
    </OrganizerShell>
  );
}
