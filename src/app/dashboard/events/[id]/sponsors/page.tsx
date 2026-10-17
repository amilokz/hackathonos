import { redirect } from 'next/navigation';
import { requireOrganizer, getOwnedEvent } from '@/lib/require-organizer';
import { migrate } from '@/lib/db';
import { Container, PageHeader, TopNav, LinkButton } from '@/components/ui';
import LogoutButton from '../../../LogoutButton';
import SponsorsClient from './SponsorsClient';

export const dynamic = 'force-dynamic';

export default async function SponsorsPage({ params }: { params: { id: string } }) {
  await migrate();
  const organizer = await requireOrganizer();
  if (!organizer) redirect('/login');
  const event = await getOwnedEvent(params.id, organizer.id);
  if (!event) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav title={organizer.name} right={<LogoutButton />} />
      <Container className="max-w-3xl py-10">
        <PageHeader
          title="Sponsors"
          subtitle={`${event.name} · shown on the public event page, grouped by tier`}
          action={
            <LinkButton href={`/dashboard/events/${params.id}`} variant="secondary">
              ← Back to event
            </LinkButton>
          }
        />
        <SponsorsClient eventId={params.id} />
      </Container>
    </div>
  );
}
