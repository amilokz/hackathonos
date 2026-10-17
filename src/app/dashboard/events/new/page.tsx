import { redirect } from 'next/navigation';
import { requireOrganizer } from '@/lib/require-organizer';
import { Container, PageHeader, TopNav } from '@/components/ui';
import LogoutButton from '../../LogoutButton';
import NewEventForm from './NewEventForm';

export const dynamic = 'force-dynamic';

export default async function NewEventPage() {
  const org = await requireOrganizer();
  if (!org) redirect('/login');

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav title={org.name} right={<LogoutButton />} />
      <Container className="max-w-2xl py-10">
        <PageHeader title="New event" subtitle="It starts as a draft — publish when you're ready." />
        <NewEventForm />
      </Container>
    </div>
  );
}
