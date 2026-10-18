import { redirect } from 'next/navigation';
import { requireOrganizer, getOwnedEvent } from '@/lib/require-organizer';
import { migrate } from '@/lib/db';
import { Container, TopNav, LinkButton } from '@/components/ui';
import { PageHeader } from '@/components/design-system';
import LogoutButton from '../../../LogoutButton';
import CertificatesClient from './CertificatesClient';

export const dynamic = 'force-dynamic';

export default async function CertificatesPage({ params }: { params: { id: string } }) {
  await migrate();
  const organizer = await requireOrganizer();
  if (!organizer) redirect('/login');
  const event = await getOwnedEvent(params.id, organizer.id);
  if (!event) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav title={organizer.name} right={<LogoutButton />} />
      <Container className="max-w-3xl py-6 sm:py-8">
        <PageHeader
          breadcrumbs={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: event.name, href: `/dashboard/events/${params.id}` },
            { label: 'Certificates' },
          ]}
          title="Certificates"
          subtitle={`${event.name} · QR-verified, printable`}
          actions={
            <LinkButton href={`/dashboard/events/${params.id}`} variant="secondary">
              ← Back to event
            </LinkButton>
          }
        />
        <CertificatesClient eventId={params.id} />
      </Container>
    </div>
  );
}
