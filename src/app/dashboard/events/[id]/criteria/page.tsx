import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db';
import { requireOrganizer, getOwnedEvent } from '@/lib/require-organizer';
import { Container, PageHeader, TopNav, LinkButton, Breadcrumb } from '@/components/ui';
import LogoutButton from '../../../LogoutButton';
import CriteriaManager from './CriteriaManager';

export const dynamic = 'force-dynamic';

export default async function CriteriaPage({ params }: { params: { id: string } }) {
  const org = await requireOrganizer();
  if (!org) redirect('/login');
  const event = await getOwnedEvent(params.id, org.id);
  if (!event) redirect('/dashboard');

  const criteria = await getDb()
    .prepare('SELECT id, name, weight, description FROM criteria WHERE event_id = ? ORDER BY rowid')
    .all(params.id);

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav title={org.name} right={<LogoutButton />} />
      <Container className="max-w-3xl py-10">
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: event.name, href: `/dashboard/events/${params.id}` },
            { label: 'Criteria' },
          ]}
        />
        <PageHeader
          title="Judging criteria"
          subtitle={event.name}
          action={
            <div className="flex flex-wrap gap-2">
              <LinkButton href={`/dashboard/events/${params.id}`} variant="secondary">
                ← Back to event
              </LinkButton>
              <LinkButton href={`/dashboard/events/${params.id}/judging`} variant="secondary">
                Go to judging →
              </LinkButton>
            </div>
          }
        />
        <CriteriaManager eventId={params.id} initial={criteria as never} />
      </Container>
    </div>
  );
}
