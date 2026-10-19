import { redirect } from 'next/navigation';
import { requireOrganizer, getOwnedEvent } from '@/lib/require-organizer';
import { migrate } from '@/lib/db';
import OrganizerShell from '@/components/OrganizerShell';
import { Container } from '@/components/ui';
import { PageHeader } from '@/components/design-system';
import AttendanceClient from './AttendanceClient';
import { isIndividualEventType, eventTypeLabel } from '@/lib/types';
import type { EventRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AttendancePage({ params }: { params: { id: string } }) {
  await migrate();
  const organizer = await requireOrganizer();
  if (!organizer) redirect('/login');
  const event = (await getOwnedEvent(params.id, organizer.id)) as
    | (EventRow & { organizer_id: string })
    | null;
  if (!event) redirect('/dashboard');
  if (!isIndividualEventType(event.event_type)) {
    redirect(`/dashboard/events/${params.id}`);
  }

  return (
    <OrganizerShell
      organizer={organizer}
      active="participants"
      eventContext={{ id: event.id, slug: event.slug }}
    >
      <Container className="py-6 sm:py-8">
        <PageHeader
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: event.name, href: `/dashboard/events/${event.id}` },
            { label: 'Attendance' },
          ]}
          title="Attendance & certificates"
          subtitle={`${eventTypeLabel(event.event_type)} registrants — tick who attended, then issue QR-verified Certificates of Participation.`}
        />
        <AttendanceClient eventId={event.id} eventName={event.name} />
      </Container>
    </OrganizerShell>
  );
}
