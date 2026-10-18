import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizer } from '@/lib/require-organizer';
import OrganizerShell from '@/components/OrganizerShell';
import ContactMessages, { type ContactMessage } from '@/components/ContactMessages';
import { Container } from '@/components/ui';
import { PageHeader } from '@/components/design-system';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Messages | HackathonOS organizer',
  description: 'Contact form submissions from visitors.',
};

export default async function MessagesPage() {
  const org = await requireOrganizer();
  if (!org) redirect('/login');

  await migrate();
  const db = getDb();
  const messages = (await db
    .prepare(
      'SELECT id, name, email, subject, message, created_at, read FROM contact_messages ORDER BY created_at DESC'
    )
    .all()) as ContactMessage[];

  return (
    <OrganizerShell organizer={org} active="messages">
      <Container className="py-6 sm:py-8">
        <PageHeader
          breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Messages' }]}
          title="Messages"
          subtitle="Submissions from the public contact page. Only visible to organizers."
        />
        <ContactMessages initial={messages} />
      </Container>
    </OrganizerShell>
  );
}
