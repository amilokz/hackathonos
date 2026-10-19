import { notFound } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { ensureSettingsColumns } from '@/lib/settings-columns';
import { ensureBrandingColumns } from '@/lib/branding-columns';
import { ensureOrganizerColumns } from '@/lib/organizer-columns';
import { eventWhiteLabelActive } from '@/lib/white-label';
import { Container, Card, PageHeader, LinkButton, BrandFooter } from '@/components/ui';
import SubmitForm from './SubmitForm';
import type { EventRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ProjectSubmitPage({ params }: { params: { slug: string } }) {
  await migrate();
  await ensureSettingsColumns();
  await ensureBrandingColumns();
  await ensureOrganizerColumns();
  const db = getDb();
  // Join the organizer so white label is gated on plan eligibility (paid feature).
  const event = await db.prepare(
    `SELECT e.*, o.plan AS organizer_plan, o.white_label_granted AS organizer_white_label_granted
     FROM events e JOIN organizers o ON o.id = e.organizer_id WHERE e.slug = ?`,
  ).get(params.slug) as (EventRow & { organizer_plan: string | null; organizer_white_label_granted: number | null }) | undefined;
  if (!event || (event.status !== 'published' && event.status !== 'closed')) notFound();
  const whiteLabelActive = eventWhiteLabelActive(event, {
    plan: event.organizer_plan,
    white_label_granted: event.organizer_white_label_granted,
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Container className="max-w-2xl py-10">
        <PageHeader title="Submit your project" subtitle={event.name} />
        {event.status === 'closed' ? (
          <Card className="p-8 text-center sm:p-10">
            <p className="text-4xl" aria-hidden="true">🏁</p>
            <h2 className="mt-3 text-xl font-bold text-slate-900">Submissions closed</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
              {event.name} has ended, so new project submissions are no longer being accepted.
              You can still browse the event page and see the final results.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <LinkButton href={`/e/${event.slug}`} variant="secondary">← Back to event</LinkButton>
              <LinkButton href={`/e/${event.slug}/leaderboard`}>🏆 View final results</LinkButton>
            </div>
          </Card>
        ) : (
          <SubmitForm eventId={event.id} eventSlug={event.slug} />
        )}
        <p className="mt-4 text-center text-sm text-slate-400">
          <a href={`/e/${event.slug}`} className="hover:underline">← Back to {event.name}</a>
        </p>
      </Container>
      <BrandFooter whiteLabel={whiteLabelActive} customText={event.custom_footer_text} />
    </div>
  );
}
