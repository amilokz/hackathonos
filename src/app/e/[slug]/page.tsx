import { notFound } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { ensureSettingsColumns } from '@/lib/settings-columns';
import { ensureBrandingColumns } from '@/lib/branding-columns';
import { ensureOrganizerColumns } from '@/lib/organizer-columns';
import { eventWhiteLabelActive } from '@/lib/white-label';
import { ensureAnnouncementColumns, type AnnouncementRow } from '@/lib/announcement-columns';
import AnnouncementBadge from '@/components/AnnouncementBadge';
import { computeResults } from '@/lib/results';
import { Container, Card, BrandFooter, type DsIconName } from '@/components/ui';
import { DsIcon } from '@/components/design-system';
import BrandTheme from '@/components/BrandTheme';
import { brandName } from '@/lib/brand';
import { toYouTubeEmbed } from '@/lib/youtube';
import { formatDate, formatEntryFee } from '@/lib/format';
import type { EventRow, SponsorRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

function lines(text: string | undefined): string[] {
  if (!text) return [];
  return text.split('\n').map((l) => l.trim()).filter(Boolean);
}

function parseFaq(text: string | undefined): Array<{ q: string; a: string }> {
  if (!text) return [];
  return text
    .split(/\n\s*\n/)
    .map((block) => {
      const blockLines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      if (!blockLines.length) return null;
      const q = blockLines[0];
      return { q: q.endsWith('?') ? q : q + '?', a: blockLines.slice(1).join(' ') };
    })
    .filter((b): b is { q: string; a: string } => b !== null);
}

function SectionTitle({ icon, title }: { icon: DsIconName; title: string }) {
  return (
    <h2 className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-slate-900">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgb(var(--brand-rgb)/0.1)] text-[var(--brand)]">
        <DsIcon name={icon} className="h-4 w-4" />
      </span>
      {title}
    </h2>
  );
}

/** Frosted-glass stat pill for dark hero backgrounds. */
function GlassPill({ icon, children, accent = false }: { icon: DsIconName; children: React.ReactNode; accent?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-sm font-medium text-white shadow-sm backdrop-blur-md">
      <DsIcon name={icon} className={`h-4 w-4 ${accent ? 'text-emerald-300' : 'text-white/90'}`} />
      {children}
    </span>
  );
}

const RANK_BADGE = [
  'from-amber-300 to-yellow-500 text-amber-950',
  'from-slate-200 to-slate-400 text-slate-800',
  'from-orange-300 to-amber-600 text-orange-950',
];

export default async function PublicEventPage({ params }: { params: { slug: string } }) {
  await migrate();
  await ensureSettingsColumns();
  await ensureBrandingColumns();
  await ensureOrganizerColumns();
  await ensureAnnouncementColumns();
  const db = getDb();
  // Join the organizer so white label can be gated on plan eligibility
  // (paid feature) — not just the per-event toggle.
  const event = await db.prepare(
    `SELECT e.*, o.plan AS organizer_plan, o.white_label_granted AS organizer_white_label_granted
     FROM events e JOIN organizers o ON o.id = e.organizer_id WHERE e.slug = ?`,
  ).get(params.slug) as (EventRow & { organizer_plan: string | null; organizer_white_label_granted: number | null }) | undefined;
  // Closed events stay publicly visible (with an "ended" banner); only drafts are hidden.
  if (!event || (event.status !== 'published' && event.status !== 'closed')) notFound();
  const isClosed = event.status === 'closed';
  const whiteLabelActive = eventWhiteLabelActive(event, {
    plan: event.organizer_plan,
    white_label_granted: event.organizer_white_label_granted,
  });

  const sponsors = await db
    .prepare("SELECT * FROM sponsors WHERE event_id = ? ORDER BY CASE tier WHEN 'platinum' THEN 0 WHEN 'gold' THEN 1 WHEN 'silver' THEN 2 ELSE 3 END")
    .all(event.id) as SponsorRow[];

  const teams = (await db.prepare("SELECT COUNT(*) AS c FROM teams WHERE event_id = ? AND approval_status = 'approved'").get(event.id) as { c: number }).c;

  const dates = [formatDate(event.start_date), formatDate(event.end_date)].filter(Boolean).join(' → ');
  const cover = event.cover_url?.trim() ? event.cover_url : null;
  const prizeLines = lines(event.prizes);
  const scheduleLines = lines(event.schedule);
  const faqItems = parseFaq(event.faq);
  const highlightEmbed = toYouTubeEmbed(event.highlight_video_url ?? '');

  // Winners spotlight for ended events (only projects that actually have scores).
  const winners = isClosed
    ? (await computeResults(event.id)).filter((r) => r.human_total !== null).slice(0, 3)
    : [];

  // Latest 3 announcements, pinned first.
  const announcements = (await db
    .prepare(
      'SELECT id, title, message, type, pinned, created_at FROM announcements WHERE event_id = ? ORDER BY pinned DESC, created_at DESC, rowid DESC LIMIT 3'
    )
    .all(event.id)) as AnnouncementRow[];

  const feeLabel = event.entry_fee > 0 ? `Entry: ${formatEntryFee(event.entry_fee)}` : 'Free entry';
  const feeFree = event.entry_fee <= 0;

  // Branding: explicit brand name (fallback: event name), logo and accent color.
  // Invalid hexes fall back to the default indigo inside BrandTheme.
  const publicName = brandName(event.brand_name, event.name);
  const brandLogo = (event.brand_logo_url ?? '').trim();

  const glassBadges = (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
      {dates && <GlassPill icon="calendar">{dates}</GlassPill>}
      <GlassPill icon="users">{teams} teams{isClosed ? ' participated' : ' registered'}</GlassPill>
      <GlassPill icon="ticket" accent={feeFree}>{feeLabel}</GlassPill>
    </div>
  );

  const heroCtas = (
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      {!isClosed && (
        <>
          <a
            href={`/e/${event.slug}/register`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-[var(--brand-dark)] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
          >
            <DsIcon name="plus" className="h-4 w-4" />
            Register your team
          </a>
          <a
            href={`/e/${event.slug}/teams`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
          >
            <DsIcon name="search" className="h-4 w-4" />
            Find a team
          </a>
          <a
            href={`/e/${event.slug}/submit`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
          >
            <DsIcon name="rocket" className="h-4 w-4" />
            Submit project
          </a>
        </>
      )}
      <a
        href={`/e/${event.slug}/leaderboard`}
        className={
          isClosed
            ? 'inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-[var(--brand-dark)] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl'
            : 'inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20'
        }
      >
        <DsIcon name="trophy" className="h-4 w-4" />
        {isClosed ? 'View final results' : 'View leaderboard'}
      </a>
    </div>
  );

  const pageCtas = (
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      {!isClosed && (
        <>
          <a
            href={`/e/${event.slug}/register`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[var(--brand-dark)] hover:shadow-xl"
          >
            <DsIcon name="plus" className="h-4 w-4" />
            Register your team
          </a>
          <a
            href={`/e/${event.slug}/teams`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <DsIcon name="search" className="h-4 w-4 text-[var(--brand)]" />
            Find a team
          </a>
          <a
            href={`/e/${event.slug}/submit`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <DsIcon name="rocket" className="h-4 w-4 text-[var(--brand)]" />
            Submit project
          </a>
        </>
      )}
      <a
        href={`/e/${event.slug}/leaderboard`}
        className={
          isClosed
            ? 'inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[var(--brand-dark)] hover:shadow-xl'
            : 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md'
        }
      >
        <DsIcon name="trophy" className={`h-4 w-4 ${isClosed ? '' : 'text-[var(--brand)]'}`} />
        {isClosed ? 'View final results' : 'View leaderboard'}
      </a>
    </div>
  );

  const endedBanner = (
    <div className="border-b border-amber-200 bg-amber-50">
      <Container className="flex flex-wrap items-center justify-center gap-2 py-3 text-center text-sm font-semibold text-amber-800">
        <DsIcon name="flag" className="h-4 w-4" />
        <span>This hackathon has ended — thanks to everyone who participated!</span>
        <a href={`/e/${event.slug}/leaderboard`} className="inline-flex items-center gap-1 underline hover:text-amber-900">
          View final results <DsIcon name="chevronRight" className="h-3.5 w-3.5" />
        </a>
      </Container>
    </div>
  );

  const announcementsSection = announcements.length > 0 && (
    <section>
      <SectionTitle icon="megaphone" title="Announcements" />
      <Card className="mt-4 divide-y divide-slate-100 p-0">
        {announcements.map((a) => (
          <div key={a.id} className="px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              {a.pinned === 1 && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand)]" aria-label="Pinned">
                  <DsIcon name="pin" className="h-3.5 w-3.5" /> Pinned
                </span>
              )}
              <AnnouncementBadge type={a.type} />
              <span className="text-xs text-slate-400">
                {new Date(a.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            {a.title && <p className="mt-1.5 font-bold text-slate-900">{a.title}</p>}
            <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{a.message}</p>
          </div>
        ))}
      </Card>
      <p className="mt-3 text-center text-sm">
        <a
          href={`/e/${event.slug}/announcements`}
          className="inline-flex items-center gap-1 font-semibold text-[var(--brand)] hover:underline"
        >
          View all announcements <DsIcon name="chevronRight" className="h-4 w-4" />
        </a>
      </p>
    </section>
  );

  const winnersSection = winners.length > 0 && (
    <section>
      <SectionTitle icon="trophy" title="Winners" />
      <Card className="mt-4 divide-y divide-slate-100 p-0">
        {winners.map((w) => (
          <div key={w.project_id} className="flex items-center gap-4 px-5 py-4">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-black shadow ${RANK_BADGE[w.rank - 1] ?? 'from-slate-200 to-slate-300 text-slate-700'}`}
              aria-label={`Rank ${w.rank}`}
            >
              {w.rank}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-slate-900">{w.title}</p>
              <p className="text-sm text-slate-500">{w.team_name}</p>
            </div>
            <p className="text-xl font-extrabold tabular-nums text-[var(--brand)]">{Math.round(w.human_total ?? 0)}</p>
          </div>
        ))}
      </Card>
      <p className="mt-3 text-center text-sm">
        <a href={`/e/${event.slug}/leaderboard`} className="inline-flex items-center gap-1 font-semibold text-[var(--brand)] hover:underline">
          See the full leaderboard <DsIcon name="chevronRight" className="h-4 w-4" />
        </a>
      </p>
    </section>
  );

  const publicHeader = (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur">
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
        {!isClosed ? (
          <a
            href={`/e/${event.slug}/register`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
          >
            <DsIcon name="plus" className="h-4 w-4" />
            Register
          </a>
        ) : (
          <a
            href={`/e/${event.slug}/leaderboard`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-dark)]"
          >
            <DsIcon name="trophy" className="h-4 w-4" />
            Results
          </a>
        )}
      </Container>
    </header>
  );

  return (
    <BrandTheme color={event.brand_color} className="min-h-screen bg-slate-50">
      {publicHeader}
      {isClosed && endedBanner}
      {cover ? (
        <>
          {/* Cover banner hero: full-width image, gradient overlay, name + glass pills over it */}
          <div className="relative overflow-hidden bg-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt={`${event.name} cover`} className="h-72 w-full object-cover sm:h-[26rem]" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-slate-900/10" />
            <div className="absolute inset-x-0 bottom-0 pb-8 sm:pb-12">
              <Container>
                <div className="flex flex-col items-start gap-5">
                  <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                    {event.logo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={event.logo_url} alt={`${event.name} logo`} className="h-16 w-16 rounded-2xl border-2 border-white/30 object-cover shadow-xl sm:h-20 sm:w-20" />
                    )}
                    <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-5xl">{event.name}</h1>
                  </div>
                  {glassBadges}
                </div>
              </Container>
            </div>
          </div>
          <Container className="py-8">
            {pageCtas}
          </Container>
        </>
      ) : (
        <>
          {/* Gradient brand hero when no cover image is set */}
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
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
            <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
            <Container className="relative py-14 sm:py-20">
              <div className="mx-auto max-w-3xl text-center">
                {event.logo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={event.logo_url} alt={`${event.name} logo`} className="mx-auto mb-6 h-20 w-20 rounded-2xl border-2 border-white/30 object-cover shadow-xl" />
                )}
                <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow sm:text-6xl">{event.name}</h1>
                {glassBadges}
                {heroCtas}
              </div>
            </Container>
          </div>
        </>
      )}

      <Container className="pb-4">
        <div className="mx-auto max-w-3xl space-y-10 pt-10">
          {winnersSection}
          {announcementsSection}

          {event.description && (
            <section>
              <SectionTitle icon="building" title="About" />
              <Card className="mt-4 p-5 sm:p-6">
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-slate-600">{event.description}</p>
              </Card>
            </section>
          )}

          {prizeLines.length > 0 && (
            <section>
              <SectionTitle icon="award" title="Prizes" />
              <Card className="mt-4 divide-y divide-slate-100 p-0">
                {prizeLines.map((p, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                      <DsIcon name="award" className="h-4 w-4" />
                    </span>
                    <p className="text-sm font-medium leading-relaxed text-slate-700">{p}</p>
                  </div>
                ))}
              </Card>
            </section>
          )}

          {scheduleLines.length > 0 && (
            <section>
              <SectionTitle icon="calendar" title="Schedule" />
              <Card className="mt-4 p-5 sm:p-6">
                <ol className="relative space-y-4 border-l-2 border-[rgb(var(--brand-rgb)/0.15)] pl-0">
                  {scheduleLines.map((s, i) => (
                    <li key={i} className="relative pl-6">
                      <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-[var(--brand)] bg-white" />
                      <p className="text-sm leading-relaxed text-slate-700">{s}</p>
                    </li>
                  ))}
                </ol>
              </Card>
            </section>
          )}

          {faqItems.length > 0 && (
            <section>
              <SectionTitle icon="messageSquare" title="FAQ" />
              <div className="mt-4 space-y-3">
                {faqItems.map((item, i) => (
                  <Card key={i} className="p-5">
                    <p className="font-bold text-slate-900">{item.q}</p>
                    {item.a && <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.a}</p>}
                  </Card>
                ))}
              </div>
            </section>
          )}

          {highlightEmbed && (
            <section>
              <SectionTitle icon="zap" title="Highlights" />
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-sm">
                <div className="aspect-video w-full">
                  <iframe
                    src={highlightEmbed}
                    title={`${event.name} highlight video`}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            </section>
          )}

          {sponsors.length > 0 && (
            <section>
              <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-slate-400">Sponsors</h2>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
                {sponsors.map((s) => {
                  const card = (
                    <Card
                      className={`flex items-center gap-3 px-5 py-3 ${
                        s.website?.trim() ? 'transition hover:-translate-y-0.5 hover:shadow-md' : ''
                      }`}
                    >
                      {s.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.logo_url} alt={s.name} className="h-8 w-auto object-contain" />
                      ) : (
                        <span className="font-bold text-slate-700">{s.name}</span>
                      )}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-500">{s.tier}</span>
                    </Card>
                  );
                  return s.website?.trim() ? (
                    <a
                      key={s.id}
                      href={s.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Visit ${s.name}`}
                      aria-label={`${s.name} website`}
                    >
                      {card}
                    </a>
                  ) : (
                    <span key={s.id}>{card}</span>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </Container>
      <BrandFooter
        whiteLabel={whiteLabelActive}
        customText={event.custom_footer_text}
      />
    </BrandTheme>
  );
}
