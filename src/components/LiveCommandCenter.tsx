'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface LiveData {
  eventName: string;
  eventSlug: string;
  status: string;
  deadlineIso: string | null;
  teamsCount: number;
  projectsCount: number;
  checkinsCount: number;
  judgingPct: number;
  scoredCells: number;
  totalCells: number;
  announcements: {
    id: string;
    title: string;
    type: string;
    pinned: number;
    message: string;
    created_at: string;
  }[];
  podium:
    | {
        team_name: string;
        title: string;
        score: number;
        /** Per-criterion average judge score (0-10) for the top-3 breakdown strip. */
        breakdown: { criterion: string; average: number }[];
      }[]
    | null;
  sponsors: { name: string; logo_url: string; tier: string }[];
}

/* ── Inline SVG icon set (lucide-style, 24 viewBox, stroke) ── */
const ICON_PATHS: Record<string, React.ReactNode> = {
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  rocket: (
    <>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </>
  ),
  scale: (
    <>
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </>
  ),
  'badge-check': (
    <>
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  trophy: (
    <>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </>
  ),
  megaphone: (
    <>
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </>
  ),
  'alert-triangle': (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  'arrow-left': (
    <>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </>
  ),
};

function Icon({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

/** Rank medal: SVG circle in gold/silver/bronze with the rank number. */
function MedalIcon({ rank, className = 'h-12 w-12 md:h-16 md:w-16' }: { rank: number; className?: string }) {
  const styles =
    rank === 1
      ? 'from-amber-300 to-amber-500 text-amber-950 ring-amber-200/60'
      : rank === 2
        ? 'from-slate-200 to-slate-400 text-slate-800 ring-slate-300/60'
        : 'from-amber-600 to-amber-800 text-amber-50 ring-amber-700/60';
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-b font-black ring-2 ${styles} ${className}`}
      aria-label={`Rank ${rank}`}
    >
      <span className="text-xl md:text-2xl">{rank}</span>
    </span>
  );
}

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, '0');
}

function CountdownUnit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-0 shrink-0 flex-col items-center">
      <div className="rounded-2xl bg-slate-800/80 px-3 py-2 text-4xl font-black tabular-nums text-white shadow-lg ring-1 ring-slate-700 md:px-4 md:py-2.5 md:text-5xl lg:text-6xl">
        {value}
      </div>
      <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 md:text-xs">
        {label}
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-slate-900/70 p-3 ring-1 ring-slate-800 md:gap-4 md:p-5">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl md:h-14 md:w-14 ${accent}`}
      >
        <Icon name={icon} className="h-6 w-6 md:h-7 md:w-7" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-2xl font-black tabular-nums text-white md:text-4xl">{value}</div>
        <div className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 md:text-xs">
          {label}
        </div>
      </div>
    </div>
  );
}

export default function LiveCommandCenter({ data, kiosk }: { data: LiveData; kiosk: boolean }) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());

  // Client clock + per-second countdown tick.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-refresh data every 15s (server refetch, client state preserved).
  useEffect(() => {
    const r = setInterval(() => router.refresh(), 15000);
    return () => clearInterval(r);
  }, [router]);

  const deadlineMs = data.deadlineIso ? Date.parse(data.deadlineIso) : null;
  const validDeadline = deadlineMs !== null && !Number.isNaN(deadlineMs);
  const diff = validDeadline ? deadlineMs - now : null;
  const closed = diff !== null && diff <= 0;
  const withinHour = diff !== null && diff > 0 && diff <= 3600_000;

  const d = diff !== null && diff > 0 ? Math.floor(diff / 1000) : 0;
  const dd = Math.floor(d / 86400);
  const hh = Math.floor((d % 86400) / 3600);
  const mm = Math.floor((d % 3600) / 60);
  const ss = d % 60;

  const tickerItems =
    data.announcements.length > 0
      ? data.announcements.map((a) => a.message)
      : [`Welcome to ${data.eventName}!`];

  // Announcements flagged type='deadline' surface in the alert banner.
  const deadlineAlerts = data.announcements.filter((a) => a.type === 'deadline');

  // Podium order: 2nd, 1st, 3rd (1st tallest, centered).
  const podiumOrder =
    data.podium && data.podium.length >= 3
      ? [data.podium[1], data.podium[0], data.podium[2]]
      : (data.podium ?? []);
  const podiumStyle = (rank: number) => {
    if (rank === 1)
      return {
        platform: 'bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 text-amber-950 ring-amber-200/50',
        h: 'h-44 md:h-60',
        delay: '0.35s',
      };
    if (rank === 2)
      return {
        platform: 'bg-gradient-to-b from-slate-200 via-slate-300 to-slate-500 text-slate-800 ring-slate-300/40',
        h: 'h-32 md:h-44',
        delay: '0.15s',
      };
    return {
      platform: 'bg-gradient-to-b from-amber-500 via-amber-700 to-amber-900 text-amber-50 ring-amber-600/40',
      h: 'h-24 md:h-32',
      delay: '0.55s',
    };
  };

  return (
    <div className="flex h-dvh flex-col overflow-x-clip overflow-y-auto bg-slate-950 text-white md:overflow-hidden">
      <style>{`
        @keyframes hcc-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes hcc-rise { 0% { transform: translateY(70px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes hcc-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes hcc-glow { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        .hcc-marquee-track { display: flex; width: max-content; animation: hcc-marquee 30s linear infinite; }
        .hcc-marquee-slow { animation-duration: 45s; }
        .hcc-marquee-ticker { animation-duration: 50s; }
        .hcc-rise { animation: hcc-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .hcc-blink { animation: hcc-blink 1s step-start infinite; }
        .hcc-glow { animation: hcc-glow 2.4s ease-in-out infinite; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-800 bg-slate-900/60 px-4 py-3 md:px-8 md:py-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black tracking-tight md:text-5xl">
            {data.eventName}
          </h1>
          {!kiosk && (
            <a
              href={`/e/${data.eventSlug}`}
              className="mt-0.5 inline-flex items-center gap-1 text-xs text-indigo-300 hover:underline md:text-sm"
            >
              <Icon name="arrow-left" className="h-3.5 w-3.5" />
              View event page
            </a>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3 md:gap-6">
          <span className="text-sm font-semibold tabular-nums text-slate-300 md:text-2xl">
            {new Date(now).toLocaleTimeString()}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-red-600/20 px-3 py-1.5 text-sm font-black uppercase tracking-widest text-red-400 ring-1 ring-red-500/50 md:px-5 md:py-2 md:text-lg">
            <span className="hcc-blink h-2.5 w-2.5 rounded-full bg-red-500 md:h-3.5 md:w-3.5" />
            Live
          </span>
        </div>
      </header>

      {/* ── Deadline alerts ────────────────────────────────── */}
      {withinHour && (
        <div className="hcc-blink flex shrink-0 items-center justify-center gap-3 bg-gradient-to-r from-amber-600 via-red-600 to-amber-600 px-4 py-2 text-center text-lg font-black uppercase tracking-widest md:text-2xl">
          <Icon name="alert-triangle" className="h-6 w-6 md:h-8 md:w-8" />
          <span>
            Submissions close in {pad(mm)}:{pad(ss)}
          </span>
        </div>
      )}
      {deadlineAlerts.map((a) => (
        <div
          key={a.id}
          className="hcc-blink flex shrink-0 items-center justify-center gap-3 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 px-4 py-2 text-center text-lg font-black uppercase tracking-widest text-white md:text-2xl"
        >
          <Icon name="alert-triangle" className="h-6 w-6 shrink-0 md:h-8 md:w-8" />
          <span className="min-w-0">
            {a.title ? `${a.title}: ` : ''}
            {a.message}
          </span>
        </div>
      ))}

      {/* ── Countdown + stat tiles ─────────────────────────── */}
      {/* Full-width stacked rows (research spec): countdown hero gets its OWN
          row, stats sit on the row below — no side-by-side columns, so the
          countdown can never bleed into the stat tiles at any viewport width. */}
      <section className="grid shrink-0 grid-cols-1 gap-4 px-4 pt-4 md:px-8 md:pt-5">
        <style>{`
          .hcc-cd-unit { flex: 1 1 0; min-width: 0; max-width: clamp(4.5rem, 11vw, 8.5rem); display: flex; justify-content: center; }
          .hcc-cd-unit > div:first-child { flex-shrink: 1; min-width: 0; width: 100%; }
          .hcc-cd-unit > div:first-child > div:first-child {
            width: 100%; height: clamp(4.5rem, 12vw, 9rem);
            display: flex; align-items: center; justify-content: center;
            overflow: hidden; padding: 0;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            font-weight: 800; font-variant-numeric: tabular-nums;
            font-size: clamp(2.5rem, 7vw, 6rem); line-height: 1;
          }
          .hcc-stat > div > div > div:first-child { font-size: clamp(2.5rem, 4vw, 3rem); line-height: 1.05; }
        `}</style>
        <div className="min-w-0 rounded-3xl border border-slate-800 bg-slate-900/80 px-4 py-8 ring-1 ring-slate-800 md:px-8">
          <div className="mb-4 flex items-center justify-center gap-2 text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-400 md:mb-6 md:text-sm">
            <Icon name="alert-triangle" className="hidden h-4 w-4" />
            {validDeadline ? 'Submissions close in' : 'Countdown'}
          </div>
          {validDeadline ? (
            closed ? (
              <div className="py-6 text-center text-4xl font-black uppercase tracking-widest text-red-500 md:py-8 md:text-6xl">
                Submissions closed
              </div>
            ) : (
              <div className="mx-auto flex w-full min-w-0 max-w-5xl items-start justify-center gap-1.5 overflow-hidden md:gap-3">
                <div className="hcc-cd-unit">
                  <CountdownUnit value={pad(dd)} label="days" />
                </div>
                <span className="flex h-[clamp(4.5rem,12vw,9rem)] shrink-0 items-center font-mono text-2xl font-black text-slate-600 md:text-4xl">
                  :
                </span>
                <div className="hcc-cd-unit">
                  <CountdownUnit value={pad(hh)} label="hrs" />
                </div>
                <span className="flex h-[clamp(4.5rem,12vw,9rem)] shrink-0 items-center font-mono text-2xl font-black text-slate-600 md:text-4xl">
                  :
                </span>
                <div className="hcc-cd-unit">
                  <CountdownUnit value={pad(mm)} label="min" />
                </div>
                <span className="flex h-[clamp(4.5rem,12vw,9rem)] shrink-0 items-center font-mono text-2xl font-black text-slate-600 md:text-4xl">
                  :
                </span>
                <div className="hcc-cd-unit">
                  <CountdownUnit value={pad(ss)} label="sec" />
                </div>
              </div>
            )
          ) : (
            <div className="py-6 text-center text-2xl font-bold text-slate-500 md:py-8 md:text-4xl">
              No deadline set
            </div>
          )}
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="hcc-stat min-w-[220px]">
            <StatTile
              icon="users"
              label="Registered teams"
              value={String(data.teamsCount)}
              accent="bg-indigo-500/20 text-indigo-300"
            />
          </div>
          <div className="hcc-stat min-w-[220px]">
            <StatTile
              icon="rocket"
              label="Projects submitted"
              value={String(data.projectsCount)}
              accent="bg-emerald-500/20 text-emerald-300"
            />
          </div>
          <div className="hcc-stat min-w-[220px]">
            <StatTile
              icon="scale"
              label="Judging progress"
              value={`${data.judgingPct}%`}
              accent="bg-amber-500/20 text-amber-300"
            />
          </div>
          <div className="hcc-stat min-w-[220px]">
            <StatTile
              icon="badge-check"
              label="Check-ins"
              value={String(data.checkinsCount)}
              accent="bg-sky-500/20 text-sky-300"
            />
          </div>
        </div>
      </section>

      {/* ── Judging progress bar ───────────────────────────── */}
      <section className="w-full shrink-0 px-4 pb-2 pt-4 md:px-8 md:pb-3 md:pt-6">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-400 md:text-sm">
          <span className="min-w-0 truncate">
            Judging progress · {data.scoredCells}/{data.totalCells} scores
          </span>
          <span className="shrink-0 rounded-full bg-indigo-500/15 px-2.5 py-0.5 font-black tabular-nums text-indigo-200 ring-1 ring-indigo-500/40">
            {data.judgingPct}%
          </span>
        </div>
        <div className="mt-2.5 h-3 overflow-hidden rounded-full bg-slate-800 ring-1 ring-slate-700/60 md:h-4">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 shadow-[0_0_12px_rgba(99,102,241,0.7)] transition-all duration-1000"
            style={{ width: `${data.judgingPct}%` }}
          />
        </div>
      </section>

      {/* ── Podium ─────────────────────────────────────────── */}
      <section className="flex min-h-0 w-full flex-1 flex-col justify-center px-4 pb-16 pt-4 md:px-8 md:pb-20 md:pt-6">
        {data.podium ? (
          <div className="w-full">
            <h2 className="mb-4 flex items-center justify-center gap-3 text-center text-lg font-black uppercase tracking-[0.2em] text-amber-300 md:mb-6 md:text-2xl">
              <Icon name="trophy" className="h-6 w-6 md:h-8 md:w-8" />
              Winners
            </h2>
            <div className="flex items-end justify-center gap-4 md:gap-10">
              {podiumOrder.map((w, idx) => {
                const rank = data.podium!.indexOf(w) + 1;
                const s = podiumStyle(rank);
                return (
                  <div
                    key={w.team_name + idx}
                    className="hcc-rise flex w-40 min-w-0 flex-col items-center md:w-72"
                    style={{ animationDelay: s.delay }}
                  >
                    <MedalIcon rank={rank} />
                    <div className="mb-4 mt-3 w-full rounded-xl bg-slate-900/70 px-2 py-1.5 text-center ring-1 ring-slate-800">
                      <div className="truncate text-sm font-black md:text-xl">{w.team_name}</div>
                      <div className="truncate text-[10px] text-slate-400 md:text-xs">{w.title}</div>
                      <div className="text-xs font-bold tabular-nums text-indigo-300 md:text-base">
                        {w.score} pts
                      </div>
                      {w.breakdown.length > 0 && (
                        <div
                          className="mt-0.5 truncate text-[10px] font-bold tabular-nums text-slate-400 md:text-xs"
                          title={w.breakdown
                            .map((b) => `${b.criterion}: ${b.average.toFixed(1)} / 10`)
                            .join(' · ')}
                        >
                          {w.breakdown.map((b) => Math.round(b.average * 10)).join(' · ')}
                        </div>
                      )}
                    </div>
                    {/* 3-tier platform */}
                    <div
                      className={`flex w-full ${s.h} flex-col items-center justify-end rounded-t-2xl pb-3 ring-1 ${s.platform}`}
                    >
                      <span className="text-4xl font-black md:text-6xl">{rank}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="relative mx-auto w-full max-w-3xl overflow-hidden rounded-3xl bg-slate-900/50 py-8 text-center ring-1 ring-slate-800 md:py-12">
            {/* decorative glow rings */}
            <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="hcc-glow h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl md:h-72 md:w-72" />
            </div>
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-amber-300/20 to-amber-600/20 ring-1 ring-amber-400/30 md:h-28 md:w-28">
              <Icon name="trophy" className="h-10 w-10 text-amber-300 md:h-14 md:w-14" />
            </div>
            <p className="relative mt-4 text-xl font-black tracking-wide text-slate-100 md:text-3xl">
              Winners will be revealed here
            </p>
            <p className="relative mt-2 text-sm text-slate-400 md:text-base">
              {data.status === 'closed'
                ? 'Results are being finalized…'
                : 'Stay tuned — the podium appears when judging closes.'}
            </p>
          </div>
        )}
      </section>

      {/* ── Sponsor strip ──────────────────────────────────── */}
      {data.sponsors.length > 0 && (
        <section className="w-full shrink-0 overflow-hidden border-t border-slate-800 bg-slate-900/60 py-2.5 md:py-3.5">
          <div className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 md:text-xs">
            Sponsors
          </div>
          <div className="hcc-marquee-track hcc-marquee-slow items-center gap-16">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 items-center gap-16" aria-hidden={copy === 1}>
                {data.sponsors.map((sp, i) => (
                  <span
                    key={`${copy}-${i}`}
                    className="flex shrink-0 items-center gap-2.5 whitespace-nowrap text-base font-bold text-slate-200 md:text-xl"
                  >
                    {sp.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sp.logo_url}
                        alt={sp.name}
                        className="h-7 w-auto max-w-36 object-contain md:h-9 md:max-w-48"
                      />
                    ) : null}
                    {sp.name}
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {sp.tier}
                    </span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Announcements ticker (bottom band) ─────────────── */}
      <section className="flex h-12 max-h-12 shrink-0 items-center overflow-hidden border-t border-slate-800 bg-slate-900/80">
        <div className="z-10 flex h-full shrink-0 items-center gap-2 border-r border-slate-700 bg-slate-900 px-3 md:gap-2.5 md:px-5">
          <Icon name="megaphone" className="h-4 w-4 text-amber-300 md:h-5 md:w-5" />
          <span className="text-xs font-black uppercase tracking-[0.2em] text-amber-300 md:text-sm">
            Live
          </span>
        </div>
        <div className="hcc-marquee-track hcc-marquee-ticker min-w-0 flex-1 items-center gap-10">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center gap-10" aria-hidden={copy === 1}>
              {tickerItems.map((msg, i) => (
                <span
                  key={`${copy}-${i}`}
                  className="flex shrink-0 items-center gap-3 whitespace-nowrap text-sm font-semibold text-slate-200 md:gap-4 md:text-lg"
                >
                  <Icon name="megaphone" className="h-4 w-4 shrink-0 text-indigo-400 md:h-5 md:w-5" />
                  {msg}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer (hidden in kiosk) ───────────────────────── */}
      {!kiosk && (
        <footer className="flex h-10 shrink-0 items-center justify-center border-t border-slate-800 bg-slate-950 px-4 md:h-12">
          <p className="truncate whitespace-nowrap text-center text-xs text-slate-400 md:text-sm">
            Powered by <span className="font-semibold text-slate-300">HackathonOS</span> · refreshing
            every 15s
          </p>
        </footer>
      )}
    </div>
  );
}
