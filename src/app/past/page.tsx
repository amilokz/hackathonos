import type { Metadata } from 'next';
import Link from 'next/link';
import { getDb, migrate } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { Container, BrandFooter } from '@/components/ui';
import PublicNav from '@/components/PublicNav';
import { toYouTubeEmbed } from '@/lib/youtube';
import { computeResults } from '@/lib/results';
import type { EventRow } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Past Hackathons — HackathonOS',
  description:
    'Hall of fame: past hackathons run on HackathonOS — winners, highlights, and recaps.',
};

type ClosedEvent = EventRow & { team_count: number; project_count: number };

interface Winner {
  rank: number;
  team_name: string;
  title: string;
  score: number;
  event_name: string;
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function TrophyIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

/** Pure-CSS hero illustration: trophy + podium + confetti dots. */
function HeroIllustration() {
  return (
    <div className="relative mx-auto hidden h-60 w-full max-w-sm sm:block lg:h-72" aria-hidden="true">
      <div className="absolute left-10 top-8 h-44 w-44 rounded-full border-[18px] border-violet-200/50" />
      <div className="absolute bottom-0 right-8 h-28 w-28 rounded-full bg-indigo-200/60 blur-xl" />
      {/* trophy card */}
      <div className="absolute left-8 top-4 rotate-[-6deg] rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 p-6 shadow-xl shadow-amber-500/30 transition hover:rotate-0">
        <TrophyIcon className="h-12 w-12 text-white" />
      </div>
      {/* podium card */}
      <div className="absolute bottom-6 right-10 rotate-[5deg] rounded-3xl bg-white p-5 shadow-lg shadow-indigo-600/15 transition hover:rotate-0">
        <div className="flex items-end gap-1.5">
          <div className="h-10 w-8 rounded-t-lg bg-slate-300" />
          <div className="h-14 w-8 rounded-t-lg bg-indigo-500" />
          <div className="h-8 w-8 rounded-t-lg bg-amber-300" />
        </div>
      </div>
      {/* medal card */}
      <div className="absolute right-4 top-10 rotate-[10deg] rounded-2xl bg-slate-900 p-4 shadow-xl transition hover:rotate-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border-4 border-amber-400 bg-amber-100 text-sm font-extrabold text-amber-700">
          1
        </div>
      </div>
      {/* confetti dots */}
      <div className="absolute bottom-10 left-24 h-3 w-3 rounded-full bg-violet-400" />
      <div className="absolute left-4 top-2 h-2 w-2 rounded-full bg-indigo-400" />
      <div className="absolute right-24 bottom-2 h-4 w-4 rounded-full bg-amber-300/80" />
      <div className="absolute left-1/2 top-0 h-2.5 w-2.5 rounded-full bg-indigo-300" />
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}

const PODIUM_STYLE = [
  { ring: 'ring-amber-300', bg: 'bg-amber-100', text: 'text-amber-700', medal: '🥇', label: 'Champion' },
  { ring: 'ring-slate-300', bg: 'bg-slate-100', text: 'text-slate-600', medal: '🥈', label: 'Runner-up' },
  { ring: 'ring-orange-300', bg: 'bg-orange-100', text: 'text-orange-700', medal: '🥉', label: '2nd runner-up' },
];

export default async function PastHackathonsPage() {
  await migrate();
  const db = getDb();

  const events = (await db
    .prepare(
      `SELECT e.*,
         (SELECT COUNT(*) FROM teams t WHERE t.event_id = e.id AND t.approval_status = 'approved') AS team_count,
         (SELECT COUNT(*) FROM projects p JOIN teams t ON t.id = p.team_id WHERE t.event_id = e.id AND t.approval_status = 'approved') AS project_count
       FROM events e WHERE e.status = 'closed' ORDER BY e.end_date DESC, e.created_at DESC`,
    )
    .all()) as ClosedEvent[];

  // Winners: top-3 scored projects per closed event (most recent event first).
  let champions: Winner[] = [];
  let championEvent: ClosedEvent | null = null;
  for (const e of events) {
    try {
      const results = (await computeResults(e.id)).filter((r) => r.human_total != null).slice(0, 3);
      if (results.length > 0) {
        champions = results.map((r) => ({
          rank: r.rank,
          team_name: r.team_name,
          title: r.title,
          score: r.human_total as number,
          event_name: e.name,
        }));
        championEvent = e;
        break;
      }
    } catch {
      /* keep scanning */
    }
  }

  // Real stats: completed events, projects submitted, certificates issued.
  let stats = { events: 0, projects: 0, certificates: 0 };
  try {
    const e = (await db.prepare(`SELECT COUNT(*) AS c FROM events WHERE status = 'closed'`).get()) as { c: number };
    const p = (await db
      .prepare(
        `SELECT COUNT(*) AS c FROM projects p JOIN teams t ON t.id = p.team_id JOIN events ev ON ev.id = t.event_id WHERE ev.status = 'closed' AND t.approval_status = 'approved'`,
      )
      .get()) as { c: number };
    const c = (await db
      .prepare(
        `SELECT COUNT(*) AS c FROM certificates c JOIN events ev ON ev.id = c.event_id WHERE ev.status = 'closed'`,
      )
      .get()) as { c: number };
    stats = { events: Number(e?.c ?? 0), projects: Number(p?.c ?? 0), certificates: Number(c?.c ?? 0) };
  } catch {
    /* stats stay zero */
  }
  const hasStats = stats.events > 0 || stats.projects > 0 || stats.certificates > 0;

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <PublicNav />

      {/* ——— Hero ——— */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-violet-50/70 to-white">
        <div aria-hidden="true" className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-indigo-200/50 blur-3xl" />
        <div aria-hidden="true" className="absolute right-0 top-16 h-80 w-80 rounded-full bg-violet-200/60 blur-3xl" />
        <div aria-hidden="true" className="absolute -right-16 top-8 h-72 w-72 rounded-full border-[24px] border-violet-200/30" />

        <Container className="relative py-14 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100/80 px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-700">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" aria-hidden="true" />
                Hall of fame
              </p>
              <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
                Celebrating the builders
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600">
                A look back at the hackathons run on HackathonOS — the teams, the
                builds, the winners, and the highlights.
              </p>
            </div>
            <HeroIllustration />
          </div>
        </Container>
      </section>

      <Container className="py-12 sm:py-16">
        {/* ——— Champions spotlight ——— */}
        {champions.length > 0 && championEvent ? (
          <section aria-label="Latest champions" className="mb-14 sm:mb-20">
            <div className="text-center">
              <p className="inline-flex rounded-full bg-indigo-100/80 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-700">
                Latest champions
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Winners of {championEvent.name}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Top three teams by judge scores.{' '}
                <Link href={`/e/${championEvent.slug}/leaderboard`} className="font-semibold text-indigo-600 hover:underline">
                  See full results →
                </Link>
              </p>
            </div>
            <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
              {champions.map((w) => {
                const s = PODIUM_STYLE[w.rank - 1] ?? PODIUM_STYLE[2];
                return (
                  <div
                    key={w.rank}
                    className={`rounded-3xl border-2 ${s.ring} bg-white p-6 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg`}
                  >
                    <p className="text-4xl" aria-hidden="true">{s.medal}</p>
                    <p className={`mt-2 inline-flex rounded-full ${s.bg} px-2.5 py-1 text-xs font-bold uppercase tracking-widest ${s.text}`}>
                      {s.label}
                    </p>
                    <p className="mt-3 text-lg font-extrabold text-slate-900">{w.team_name}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{w.title}</p>
                    <p className="mt-3 text-2xl font-extrabold text-indigo-600">{w.score.toFixed(1)}</p>
                    <p className="text-xs text-slate-400">judge score / 100</p>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* ——— Closed events ——— */}
        <section aria-label="Past hackathons">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="inline-flex rounded-full bg-indigo-100/80 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-700">
                Powered by HackathonOS
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Past hackathons
              </h2>
            </div>
          </div>

          {events.length === 0 ? (
            <div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-dashed border-indigo-200 bg-indigo-50/40 p-10 text-center">
              <p className="text-5xl" aria-hidden="true">🏁</p>
              <h3 className="mt-4 text-xl font-bold text-slate-900">No past hackathons yet</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Closed events will show up here with their highlights and recaps. Run your
                first hackathon and it could be the first entry.
              </p>
              <div className="mt-6">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-indigo-500"
                >
                  Create your hackathon
                  <ArrowIcon />
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {events.map((e) => {
                const cover = e.cover_url?.trim() ? e.cover_url : null;
                const dates = [formatDate(e.start_date), formatDate(e.end_date)].filter(Boolean).join(' → ');
                const embed = toYouTubeEmbed(e.highlight_video_url ?? '');
                return (
                  <article
                    key={e.id}
                    className="group overflow-hidden rounded-3xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-600/10"
                  >
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt={`${e.name} cover`} className="h-44 w-full object-cover sm:h-52" />
                    ) : (
                      <div className="flex h-44 items-center justify-center bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 sm:h-52" aria-hidden="true">
                        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-3xl font-extrabold text-white backdrop-blur">
                          {e.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="p-6 sm:p-7">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-xl font-extrabold tracking-tight text-slate-900">
                          <Link href={`/e/${e.slug}`} className="transition group-hover:text-indigo-700">
                            {e.name}
                          </Link>
                        </h3>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                          Completed
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {dates && (
                          <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-semibold text-indigo-700">
                            📅 {dates}
                          </span>
                        )}
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                          👥 {e.team_count} teams
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                          🚀 {e.project_count} projects
                        </span>
                      </div>
                      {e.description && (
                        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-slate-600">{e.description}</p>
                      )}
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
                      <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                        <Link
                          href={`/e/${e.slug}/leaderboard`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-500"
                        >
                          <TrophyIcon className="h-3.5 w-3.5" />
                          Final results
                        </Link>
                        <Link
                          href={`/e/${e.slug}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
                        >
                          View event
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ——— Where it started (TechKhwa legacy — honest labeling) ——— */}
        <section aria-label="Where it started" className="mt-16 sm:mt-24">
          <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-8 sm:p-12">
            <div aria-hidden="true" className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-200/40 blur-3xl" />
            <div aria-hidden="true" className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-indigo-200/40 blur-3xl" />
            <div className="relative">
              <p className="inline-flex rounded-full bg-indigo-100/80 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-700">
                Where it started
              </p>
              <h2 className="mt-3 max-w-2xl text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Before the platform, there were the builders
              </h2>
              <p className="mt-3 max-w-2xl leading-relaxed text-slate-600">
                HackathonOS was born out of real hackathon experience. Our founder
                Kashif Ali has judged national hackathons and mentored builders across
                Pakistan — that&rsquo;s the standard this platform is built to.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-amber-700">
                    Judged by our founder
                  </span>
                  <h3 className="mt-3 text-lg font-extrabold text-slate-900">
                    AI Seekho Builders Day
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    National hackathon at NIC Islamabad with{' '}
                    <span className="font-bold text-slate-800">80+ teams</span> — Kashif Ali
                    served as a hackathon judge, evaluating builds across AI and
                    innovation tracks.
                  </p>
                  <p className="mt-3 text-xs font-medium text-slate-400">
                    An independent event — run before HackathonOS existed, not on this platform.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-6">
                  <span className="inline-flex rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-indigo-700">
                    Community roots
                  </span>
                  <h3 className="mt-3 text-lg font-extrabold text-slate-900">
                    TechKhwa meetups &amp; youth summits
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    From Peshawar community meetups to youth-summit stages, TechKhwa has
                    been bringing new builders into tech — the same community this
                    platform now serves.
                  </p>
                  <p className="mt-3 text-xs font-medium text-slate-400">
                    See the community gallery on the homepage.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ——— Stats band (real DB counts only) ——— */}
        <section aria-label="Platform stats" className="mt-16 sm:mt-20">
          <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-8 sm:p-12">
            <div aria-hidden="true" className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-200/40 blur-3xl" />
            <div aria-hidden="true" className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-indigo-200/40 blur-3xl" />
            <div className="relative">
              <p className="inline-flex rounded-full bg-indigo-100/80 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-700">
                The record so far
              </p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                Every event writes history
              </h2>
              {hasStats ? (
                <div className="mt-8 grid grid-cols-1 gap-8 border-t border-indigo-100 pt-8 sm:grid-cols-3">
                  <Stat value={String(stats.events)} label="Hackathons completed" />
                  <Stat value={String(stats.projects)} label="Projects submitted" />
                  <Stat value={String(stats.certificates)} label="Certificates issued" />
                </div>
              ) : (
                <div className="mt-8 rounded-2xl border border-dashed border-indigo-200 bg-white/70 px-6 py-8 text-center">
                  <p className="text-lg font-bold text-slate-800">Growing with every hackathon</p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                    Completed events, submitted projects, and issued certificates will be
                    counted here — real numbers, no vanity metrics.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ——— CTA banner ——— */}
        <section aria-label="Get started" className="mt-16 sm:mt-20">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-950 px-8 py-12 text-center sm:px-12 sm:py-16">
            <div aria-hidden="true" className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/25 blur-3xl" />
            <div aria-hidden="true" className="absolute -bottom-20 -right-12 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl" />
            <div aria-hidden="true" className="absolute left-1/2 top-0 h-40 w-[36rem] -translate-x-1/2 rounded-full bg-indigo-400/15 blur-3xl" />
            <div className="relative">
              <p className="inline-flex rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-200">
                Your turn
              </p>
              <h2 className="mx-auto mt-4 max-w-xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Run your hackathon — join the hall of fame
              </h2>
              <p className="mx-auto mt-3 max-w-md text-indigo-200">
                It&rsquo;s free, fast, and built for builders.
              </p>
              <div className="mt-8">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-950/40 transition hover:-translate-y-0.5 hover:bg-indigo-500"
                >
                  Get started free
                  <ArrowIcon />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </Container>

      <BrandFooter />
    </main>
  );
}
