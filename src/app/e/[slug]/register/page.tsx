import { notFound } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { ensureSettingsColumns } from '@/lib/settings-columns';
import { Container, Card, PageHeader, LinkButton, BrandFooter } from '@/components/ui';
import RegisterForm from './RegisterForm';
import type { EventRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function TeamRegisterPage({ params }: { params: { slug: string } }) {
  await migrate();
  await ensureSettingsColumns();
  const db = getDb();
  const event = await db.prepare('SELECT * FROM events WHERE slug = ?').get(params.slug) as EventRow | undefined;
  if (!event || (event.status !== 'published' && event.status !== 'closed')) notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      <Container className="max-w-2xl py-10">
        <PageHeader title="Register your team" subtitle={event.name} />
        {event.status === 'closed' ? (
          <Card className="p-8 text-center sm:p-10">
            <p className="text-4xl" aria-hidden="true">🏁</p>
            <h2 className="mt-3 text-xl font-bold text-slate-900">Registrations closed</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
              {event.name} has ended, so new team registrations are no longer being accepted.
              You can still browse the event page and see the final results.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <LinkButton href={`/e/${event.slug}`} variant="secondary">← Back to event</LinkButton>
              <LinkButton href={`/e/${event.slug}/leaderboard`}>🏆 View final results</LinkButton>
            </div>
          </Card>
        ) : (
          <RegisterForm eventId={event.id} eventSlug={event.slug} />
        )}
        <p className="mt-4 text-center text-sm text-slate-400">
          <a href={`/e/${event.slug}`} className="hover:underline">← Back to {event.name}</a>
        </p>
      </Container>
      <BrandFooter whiteLabel={Boolean(event.white_label)} customText={event.custom_footer_text} />
    </div>
  );
}
