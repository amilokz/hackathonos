import type { Metadata } from 'next';
import { getDb, migrate } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { Container, Card, LinkButton, BrandFooter, TopNav } from '@/components/ui';
import { toYouTubeEmbed } from '@/lib/youtube';
import type { EventRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Past Hackathons — HackathonOS',
  description: 'Browse past hackathons run on HackathonOS: winners, highlights, and recaps.',
};

type ClosedEvent = EventRow & { team_count: number };

export default async function PastHackathonsPage() {
  await migrate();
  const db = getDb();
  const events = (await db
    .prepare(
      `SELECT e.*, (SELECT COUNT(*) FROM teams t WHERE t.event_id = e.id) AS team_count
       FROM events e WHERE e.status = 'closed' ORDER BY e.end_date DESC, e.created_at DESC`,
    )
    .all()) as ClosedEvent[];

  return (
    <div className="min-h-screen bg-slate-50">
      <TopNav title="" right={<LinkButton href="/register" className="!px-3 !py-2">Get started free</LinkButton>} />
      <Container className="py-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">Hall of fame</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Past hackathons</h1>
          <p className="mt-3 text-slate-600">
            A look back at the hackathons run on HackathonOS — the teams, the builds, and the highlights.
          </p>
        </div>

        {events.length === 0 ? (
          <Card className="mx-auto mt-10 max-w-2xl p-10 text-center">
            <p className="text-5xl">🏁</p>
            <h2 className="mt-4 text-xl font-bold text-slate-900">No past hackathons yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Closed events will show up here with their highlights and recaps. Run your first hackathon and it could be the first entry.
            </p>
            <div className="mt-6">
              <LinkButton href="/register">Create your hackathon</LinkButton>
            </div>
          </Card>
        ) : (
          <div className="mx-auto mt-10 max-w-4xl space-y-8">
            {events.map((e) => {
              const cover = e.cover_url?.trim() ? e.cover_url : null;
              const dates = [formatDate(e.start_date), formatDate(e.end_date)].filter(Boolean).join(' → ');
              const embed = toYouTubeEmbed(e.highlight_video_url ?? '');
              return (
                <Card key={e.id} className="overflow-hidden">
                  {cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt={`${e.name} cover`} className="h-44 w-full object-cover sm:h-56" />
                  )}
                  <div className="p-6 sm:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                          <a href={`/e/${e.slug}`} className="transition hover:text-indigo-700 hover:underline">
                            {e.name}
                          </a>
                        </h2>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {dates && <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">📅 {dates}</span>}
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">👥 {e.team_count} teams</span>
                        </div>
                      </div>
                      <LinkButton href={`/e/${e.slug}/leaderboard`} variant="secondary" className="!px-3 !py-2 !text-xs">
                        Final results
                      </LinkButton>
                    </div>
                    {e.description && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-600">{e.description}</p>}
                    {embed && (
                      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">
                        <div className="aspect-video w-full">
                          <iframe
                            src={embed}
                            title={`${e.name} highlight video`}
                            className="h-full w-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Container>
      <BrandFooter />
    </div>
  );
}
