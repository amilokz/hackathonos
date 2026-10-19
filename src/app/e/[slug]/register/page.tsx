import { notFound } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { ensureSettingsColumns } from '@/lib/settings-columns';
import { ensureBrandingColumns } from '@/lib/branding-columns';
import { ensureOrganizerColumns } from '@/lib/organizer-columns';
import { eventWhiteLabelActive } from '@/lib/white-label';
import { Container, Card, BrandFooter } from '@/components/ui';
import { DsIcon } from '@/components/design-system';
import BrandTheme from '@/components/BrandTheme';
import { brandName } from '@/lib/brand';
import { formatEntryFee } from '@/lib/format';
import RegisterForm from './RegisterForm';
import type { EventRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function TeamRegisterPage({ params }: { params: { slug: string } }) {
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

  const publicName = brandName(event.brand_name, event.name);
  const brandLogo = (event.brand_logo_url ?? '').trim();
  const isClosed = event.status === 'closed';

  return (
    <BrandTheme color={event.brand_color} className="min-h-screen bg-slate-50">
      {/* Slim top bar */}
      <header className="border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <Container className="flex h-16 items-center justify-between gap-4">
          <a href={`/e/${event.slug}`} className="flex min-w-0 items-center gap-3">
            {brandLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brandLogo} alt={`${publicName} logo`} className="h-9 w-9 shrink-0 rounded-xl object-contain" />
            ) : (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-sm font-black text-white">
                {publicName.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate text-lg font-extrabold tracking-tight text-slate-900">{publicName}</span>
          </a>
          <a
            href={`/e/${event.slug}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <DsIcon name="chevronLeft" className="h-4 w-4" />
            Back to event
          </a>
        </Container>
      </header>

      {/* Gradient hero band */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand)] via-[var(--brand-dark)] to-slate-950" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.55) 1px, transparent 0)',
            backgroundSize: '26px 26px',
          }}
          aria-hidden="true"
        />
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
        <Container className="relative py-10 sm:py-14">
          <div className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white backdrop-blur-md">
              <DsIcon name="users" className="h-3.5 w-3.5" />
              Team registration
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white drop-shadow sm:text-4xl">
              Register your team
            </h1>
            <p className="mt-2 text-sm font-medium text-white/80">{event.name}</p>
            {event.entry_fee > 0 && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-md">
                <DsIcon name="ticket" className="h-4 w-4" />
                Entry fee: {formatEntryFee(event.entry_fee)}
              </p>
            )}
          </div>
        </Container>
      </div>

      <Container className="max-w-2xl py-8 sm:py-10">
        {isClosed ? (
          <Card className="p-8 text-center sm:p-10">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <DsIcon name="flag" className="h-7 w-7" />
            </span>
            <h2 className="mt-4 text-xl font-bold text-slate-900">Registrations closed</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
              {event.name} has ended, so new team registrations are no longer being accepted.
              You can still browse the event page and see the final results.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <a
                href={`/e/${event.slug}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <DsIcon name="chevronLeft" className="h-4 w-4" />
                Back to event
              </a>
              <a
                href={`/e/${event.slug}/leaderboard`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
              >
                <DsIcon name="trophy" className="h-4 w-4" />
                View final results
              </a>
            </div>
          </Card>
        ) : (
          <>
            {event.entry_fee > 0 && event.payment_instructions?.trim() && (
              <Card className="mb-6 border-amber-200 bg-amber-50 p-5 sm:p-6">
                <p className="flex items-center gap-2 font-bold text-slate-900">
                  <DsIcon name="ticket" className="h-5 w-5 text-amber-600" />
                  How to pay the entry fee
                </p>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                  {event.payment_instructions}
                </p>
              </Card>
            )}
            <RegisterForm eventId={event.id} eventSlug={event.slug} />
          </>
        )}
      </Container>
      <BrandFooter whiteLabel={whiteLabelActive} customText={event.custom_footer_text} />
    </BrandTheme>
  );
}
