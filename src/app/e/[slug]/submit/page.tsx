import { notFound } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { Container, PageHeader, BrandFooter } from '@/components/ui';
import SubmitForm from './SubmitForm';
import type { EventRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ProjectSubmitPage({ params }: { params: { slug: string } }) {
  await migrate();
  const db = getDb();
  const event = await db.prepare('SELECT * FROM events WHERE slug = ?').get(params.slug) as EventRow | undefined;
  if (!event || event.status !== 'published') notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      <Container className="max-w-2xl py-10">
        <PageHeader title="Submit your project" subtitle={event.name} />
        <SubmitForm eventId={event.id} eventSlug={event.slug} />
        <p className="mt-4 text-center text-sm text-slate-400">
          <a href={`/e/${event.slug}`} className="hover:underline">← Back to {event.name}</a>
        </p>
      </Container>
      <BrandFooter />
    </div>
  );
}
