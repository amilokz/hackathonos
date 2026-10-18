import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizer } from '@/lib/require-organizer';
import OrganizerShell from '@/components/OrganizerShell';
import ContactMessages, { type ContactMessage } from '@/components/ContactMessages';
import { Container, PageHeader, Breadcrumb } from '@/components/ui';

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
      <Container className="py-8 sm:py-10">
        <Breadcrumb
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Messages' },
          ]}
        />
        <PageHeader
          title="Messages"
          subtitle="Submissions from the public contact page. Only visible to organizers."
        />
        <ContactMessages initial={messages} />
      </Container>
    </OrganizerShell>
  );
}
