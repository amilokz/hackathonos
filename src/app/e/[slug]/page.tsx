import { notFound } from 'next/navigation';
import { getDb, migrate } from '@/lib/db';
import { ensureSettingsColumns } from '@/lib/settings-columns';
import { computeResults } from '@/app/api/events/[id]/results/route';
import { Container, Card, LinkButton, BrandFooter } from '@/components/ui';
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

function SectionTitle({ emoji, title }: { emoji: string; title: string }) {
  return (
    <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
      <span className="mr-2">{emoji}</span>
      {title}
    </h2>
  );
}

export default async function PublicEventPage({ params }: { params: { slug: string } }) {
  await migrate();
  await ensureSettingsColumns();
  const db = getDb();
  const event = await db.prepare('SELECT * FROM events WHERE slug = ?').get(params.slug) as EventRow | undefined;
  // Closed events stay publicly visible (with an "ended" banner); only drafts are hidden.
  if (!event || (event.status !== 'published' && event.status !== 'closed')) notFound();
  const isClosed = event.status === 'closed';

  const sponsors = await db
    .prepare("SELECT * FROM sponsors WHERE event_id = ? ORDER BY CASE tier WHEN 'platinum' THEN 0 WHEN 'gold' THEN 1 WHEN 'silver' THEN 2 ELSE 3 END")
    .all(event.id) as SponsorRow[];

  const teams = (await db.prepare('SELECT COUNT(*) AS c FROM teams WHERE event_id = ?').get(event.id) as { c: number }).c;

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

  const badges = (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm">
      {dates && <span className="rounded-full bg-white px-3 py-1.5 font-medium text-slate-600 shadow-sm">📅 {dates}</span>}
      <span className="rounded-full bg-white px-3 py-1.5 font-medium text-slate-600 shadow-sm">👥 {teams} teams{isClosed ? ' participated' : ' registered'}</span>
      {event.entry_fee > 0 ? (
        <span className="rounded-full bg-white px-3 py-1.5 font-medium text-slate-600 shadow-sm">🎟️ Entry: {formatEntryFee(event.entry_fee)}</span>
      ) : (
        <span className="rounded-full bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700 shadow-sm">🎟️ Free entry</span>
      )}
    </div>
  );

  const ctas = (
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      {!isClosed && (
        <>
          <LinkButton href={`/e/${event.slug}/register`}>Register your team</LinkButton>
          <LinkButton href={`/e/${event.slug}/submit`} variant="secondary">Submit project</LinkButton>
        </>
      )}
      <LinkButton href={`/e/${event.slug}/leaderboard`} variant={isClosed ? 'primary' : 'secondary'}>
        {isClosed ? '🏆 View final results' : 'View leaderboard'}
      </LinkButton>
    </div>
  );

  const endedBanner = (
    <div className="border-b border-amber-200 bg-amber-50">
      <Container className="py-3 text-center text-sm font-semibold text-amber-800">
        🏁 This hackathon has ended — thanks to everyone who participated!{' '}
        <a href={`/e/${event.slug}/leaderboard`} className="underline hover:text-amber-900">
          View final results →
        </a>
      </Container>
    </div>
  );

  const winnersSection = winners.length > 0 && (
    <section>
      <SectionTitle emoji="🏆" title="Winners" />
      <Card className="mt-3 divide-y divide-slate-100 p-0">
        {winners.map((w) => (
          <div key={w.project_id} className="flex items-center gap-4 px-5 py-4">
            <span className="w-10 text-center text-2xl" aria-hidden="true">
              {w.rank === 1 ? '🥇' : w.rank === 2 ? '🥈' : '🥉'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold text-slate-900">{w.title}</p>
              <p className="text-sm text-slate-500">{w.team_name}</p>
            </div>
            <p className="text-xl font-extrabold text-indigo-600">{Math.round(w.human_total ?? 0)}</p>
          </div>
        ))}
      </Card>
      <p className="mt-3 text-center text-sm">
        <a href={`/e/${event.slug}/leaderboard`} className="font-semibold text-indigo-600 hover:underline">
          See the full leaderboard →
        </a>
      </p>
    </section>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {isClosed && endedBanner}
      {cover ? (
        <>
          {/* Cover banner hero: full-width image, gradient overlay, name over it */}
          <div className="relative overflow-hidden bg-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt={`${event.name} cover`} className="h-64 w-full object-cover sm:h-96" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 pb-8 sm:pb-10">
              <Container>
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
                  {event.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={event.logo_url} alt={`${event.name} logo`} className="h-16 w-16 rounded-2xl border-2 border-white/30 object-cover shadow-lg" />
                  )}
                  <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow sm:text-5xl">{event.name}</h1>
                    {dates && <p className="mt-2 text-sm font-medium text-white/80">📅 {dates}</p>}
                  </div>
                </div>
              </Container>
            </div>
          </div>
          <Container className="relative z-10 -mt-0 py-8">
            {badges}
            {ctas}
          </Container>
        </>
      ) : (
        <Container className="py-12">
          <div className="mx-auto max-w-3xl text-center">
            {event.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.logo_url} alt={`${event.name} logo`} className="mx-auto mb-6 h-20 w-20 rounded-2xl object-cover" />
            )}
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">{event.name}</h1>
            {badges}
            {ctas}
          </div>
        </Container>
      )}

      <Container className="pb-4">
        <div className="mx-auto max-w-3xl space-y-8">
          {winnersSection}

          {event.description && (
            <section>
              <SectionTitle emoji="ℹ️" title="About" />
              <p className="mt-3 whitespace-pre-line leading-relaxed text-slate-600">{event.description}</p>
            </section>
          )}

          {prizeLines.length > 0 && (
            <section>
              <SectionTitle emoji="🏆" title="Prizes" />
              <Card className="mt-3 divide-y divide-slate-100 p-0">
                {prizeLines.map((p, i) => (
                  <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                    <span className="mt-0.5 text-lg">🏅</span>
                    <p className="text-sm font-medium leading-relaxed text-slate-700">{p}</p>
                  </div>
                ))}
              </Card>
            </section>
          )}

          {scheduleLines.length > 0 && (
            <section>
              <SectionTitle emoji="🗓️" title="Schedule" />
              <Card className="mt-3 p-5 sm:p-6">
                <ol className="relative space-y-4 border-l-2 border-indigo-100 pl-0">
                  {scheduleLines.map((s, i) => (
                    <li key={i} className="relative pl-6">
                      <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-indigo-500 bg-white" />
                      <p className="text-sm leading-relaxed text-slate-700">{s}</p>
                    </li>
                  ))}
                </ol>
              </Card>
            </section>
          )}

          {faqItems.length > 0 && (
            <section>
              <SectionTitle emoji="❓" title="FAQ" />
              <div className="mt-3 space-y-3">
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
              <SectionTitle emoji="🎬" title="Highlights" />
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-sm">
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
                {sponsors.map((s) => (
                  <Card key={s.id} className="flex items-center gap-3 px-5 py-3">
                    {s.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.logo_url} alt={s.name} className="h-8 w-auto object-contain" />
                    ) : (
                      <span className="font-bold text-slate-700">{s.name}</span>
                    )}
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-500">{s.tier}</span>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      </Container>
      <BrandFooter
        whiteLabel={Boolean(event.white_label)}
        customText={event.custom_footer_text}
      />
    </div>
  );
}
