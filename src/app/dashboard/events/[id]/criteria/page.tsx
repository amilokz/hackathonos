import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { requireOrganizer, getOwnedEvent } from '@/lib/require-organizer';
import OrganizerShell from '@/components/OrganizerShell';
import { Container, LinkButton } from '@/components/ui';
import { PageHeader } from '@/components/design-system';
import CriteriaManager from './CriteriaManager';

export const dynamic = 'force-dynamic';

export default async function CriteriaPage({ params }: { params: { id: string } }) {
  const org = await requireOrganizer();
  if (!org) redirect('/login');
  const event = await getOwnedEvent(params.id, org.id);
  if (!event) redirect('/dashboard');

  const criteria = await getDb()
    .prepare('SELECT id, name, weight, description FROM criteria WHERE event_id = ? ORDER BY weight DESC, rowid')
    .all(params.id);

  return (
    <OrganizerShell organizer={org} active="events" eventContext={{ id: event.id, slug: event.slug }}>
      <Container className="py-6 sm:py-8">
        <PageHeader
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: event.name, href: `/dashboard/events/${params.id}` },
            { label: 'Criteria' },
          ]}
          title="Judging criteria"
          subtitle={`Define how judges score projects at ${event.name}. Weights should total 100%.`}
          actions={
            <div className="flex flex-wrap gap-2">
              <LinkButton href={`/dashboard/events/${params.id}/judging`} variant="secondary">
                Go to judging
              </LinkButton>
            </div>
          }
        />
        <CriteriaManager eventId={params.id} initial={criteria as never} />
      </Container>
    </OrganizerShell>
  );
}
