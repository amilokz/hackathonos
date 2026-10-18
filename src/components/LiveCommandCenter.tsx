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
  podium: { team_name: string; title: string; score: number }[] | null;
  sponsors: { name: string; logo_url: string; tier: string }[];
}

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, '0');
}

function CountdownUnit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-col items-center">
      <div className="rounded-2xl bg-slate-800/80 px-2 py-1.5 text-3xl font-black tabular-nums text-white shadow-lg ring-1 ring-slate-700 md:px-3 md:text-4xl lg:px-4 lg:text-5xl">
        {value}
      </div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 md:text-xs">
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
    <div className="flex items-center gap-3 rounded-2xl bg-slate-900/70 p-3 ring-1 ring-slate-800 md:p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl md:h-12 md:w-12 md:text-2xl ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="truncate text-2xl font-black text-white md:text-4xl">{value}</div>
        <div className="truncate text-[10px] font-semibold uppercase tracking-widest text-slate-400 md:text-xs">
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
        bar: 'bg-gradient-to-b from-amber-300 to-amber-500 text-amber-950 ring-amber-200',
        h: 'h-40 md:h-52',
        medal: '🥇',
        delay: '0.35s',
      };
    if (rank === 2)
      return {
        bar: 'bg-gradient-to-b from-slate-200 to-slate-400 text-slate-800 ring-slate-300',
        h: 'h-28 md:h-36',
        medal: '🥈',
        delay: '0.15s',
      };
    return {
      bar: 'bg-gradient-to-b from-amber-600 to-amber-800 text-amber-50 ring-amber-700',
      h: 'h-20 md:h-28',
      medal: '🥉',
      delay: '0.55s',
    };
  };

  return (
    <div className="flex h-dvh flex-col overflow-x-clip overflow-y-auto bg-slate-950 text-white md:overflow-hidden">
      <style>{`
        @keyframes hcc-marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        @keyframes hcc-rise { 0% { transform: translateY(70px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes hcc-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        .hcc-marquee-track { display: flex; width: max-content; animation: hcc-marquee 30s linear infinite; }
        .hcc-marquee-slow { animation-duration: 45s; }
        .hcc-rise { animation: hcc-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .hcc-blink { animation: hcc-blink 1s step-start infinite; }
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
              className="mt-0.5 inline-block text-xs text-indigo-300 hover:underline md:text-sm"
            >
              ← View event page
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

      {/* ── Deadline alert ─────────────────────────────────── */}
      {withinHour && (
        <div className="hcc-blink shrink-0 bg-gradient-to-r from-amber-600 via-red-600 to-amber-600 px-4 py-2 text-center text-lg font-black uppercase tracking-widest md:text-2xl">
          ⚠ Submissions close in {pad(mm)}:{pad(ss)}
        </div>
      )}
      {deadlineAlerts.map((a) => (
        <div
          key={a.id}
          className="hcc-blink shrink-0 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 px-4 py-2 text-center text-lg font-black uppercase tracking-widest text-white md:text-2xl"
        >
          ⚠️ {a.title ? `${a.title}: ` : ''}
          {a.message}
        </div>
      ))}

      {/* ── Countdown + stat tiles ─────────────────────────── */}
      <section className="grid shrink-0 grid-cols-1 gap-4 px-4 pt-4 md:px-8 lg:grid-cols-12">
        <div className="min-w-0 overflow-hidden rounded-3xl bg-slate-900/70 p-4 ring-1 ring-slate-800 md:p-6 lg:col-span-5">
          <div className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-slate-400 md:text-sm">
            {validDeadline ? 'Submissions close in' : 'Countdown'}
          </div>
          {validDeadline ? (
            closed ? (
              <div className="py-4 text-center text-4xl font-black uppercase tracking-widest text-red-500 md:text-6xl">
                Submissions closed
              </div>
            ) : (
              <div className="flex items-start justify-center gap-1 md:gap-2">
                <CountdownUnit value={pad(dd)} label="days" />
                <span className="pt-1 text-2xl font-black text-slate-600 md:pt-2 md:text-4xl">:</span>
                <CountdownUnit value={pad(hh)} label="hrs" />
                <span className="pt-1 text-2xl font-black text-slate-600 md:pt-2 md:text-4xl">:</span>
                <CountdownUnit value={pad(mm)} label="min" />
                <span className="pt-1 text-2xl font-black text-slate-600 md:pt-2 md:text-4xl">:</span>
                <CountdownUnit value={pad(ss)} label="sec" />
              </div>
            )
          ) : (
            <div className="py-4 text-center text-2xl font-bold text-slate-500 md:text-4xl">
              No deadline set
            </div>
          )}
        </div>
        <div className="grid min-w-0 grid-cols-2 gap-3 md:gap-4 lg:col-span-7">
          <StatTile
            icon="👥"
            label="Registered teams"
            value={String(data.teamsCount)}
            accent="bg-indigo-500/20 text-indigo-300"
          />
          <StatTile
            icon="🚀"
            label="Projects submitted"
            value={String(data.projectsCount)}
            accent="bg-emerald-500/20 text-emerald-300"
          />
          <StatTile
            icon="⚖️"
            label="Judging progress"
            value={`${data.judgingPct}%`}
            accent="bg-amber-500/20 text-amber-300"
          />
          <StatTile
            icon="✅"
            label="Check-ins"
            value={String(data.checkinsCount)}
            accent="bg-sky-500/20 text-sky-300"
          />
        </div>
      </section>

      {/* ── Announcements ticker ───────────────────────────── */}
      <section className="flex shrink-0 items-center overflow-hidden border-y border-slate-800 bg-slate-900 py-2.5 md:py-3">
        <div className="z-10 shrink-0 border-r border-slate-700 bg-slate-900 px-3 py-1 md:px-5">
          <span className="text-xs font-black uppercase tracking-widest text-amber-300 md:text-sm">
            📢 Live
          </span>
        </div>
        <div className="hcc-marquee-track min-w-0 flex-1 items-center gap-10">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center gap-10" aria-hidden={copy === 1}>
              {tickerItems.map((msg, i) => (
                <span key={`${copy}-${i}`} className="flex items-center gap-10 whitespace-nowrap">
                  <span className="text-base font-semibold text-indigo-200 md:text-2xl">
                    📣 {msg}
                  </span>
                  <span className="text-slate-600">•</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── Judging progress bar ───────────────────────────── */}
      <section className="shrink-0 px-4 pt-3 md:px-8">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-400 md:text-sm">
          <span>
            Judging progress · {data.scoredCells}/{data.totalCells} scores
          </span>
          <span className="text-indigo-300">{data.judgingPct}%</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-800 md:h-4">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-1000"
            style={{ width: `${data.judgingPct}%` }}
          />
        </div>
      </section>

      {/* ── Podium ─────────────────────────────────────────── */}
      <section className="flex min-h-0 flex-1 flex-col justify-center px-4 py-2 md:px-8">
        {data.podium ? (
          <div>
            <h2 className="mb-2 text-center text-lg font-black uppercase tracking-widest text-amber-300 md:text-2xl">
              🏆 Winners
            </h2>
            <div className="flex items-end justify-center gap-3 md:gap-6">
              {podiumOrder.map((w, idx) => {
                const rank = data.podium!.indexOf(w) + 1;
                const s = podiumStyle(rank);
                return (
                  <div
                    key={w.team_name + idx}
                    className="hcc-rise flex w-40 flex-col items-center md:w-64"
                    style={{ animationDelay: s.delay }}
                  >
                    <div className="mb-1 text-3xl md:text-5xl">{s.medal}</div>
                    <div className="mb-2 w-full rounded-xl bg-slate-900/70 px-2 py-1.5 text-center ring-1 ring-slate-800">
                      <div className="truncate text-sm font-black md:text-xl">{w.team_name}</div>
                      <div className="truncate text-[10px] text-slate-400 md:text-xs">{w.title}</div>
                      <div className="text-xs font-bold text-indigo-300 md:text-base">
                        {w.score} pts
                      </div>
                    </div>
                    <div
                      className={`flex w-full ${s.h} items-end justify-center rounded-t-2xl pb-3 ring-1 ${s.bar}`}
                    >
                      <span className="text-4xl font-black md:text-6xl">{rank}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-3xl bg-slate-900/50 py-6 text-center ring-1 ring-slate-800 md:py-10">
            <div className="text-4xl md:text-6xl">🏆</div>
            <p className="mt-2 text-xl font-black tracking-wide text-slate-200 md:text-3xl">
              Winners will be revealed here
            </p>
            <p className="mt-1 text-sm text-slate-500 md:text-base">
              {data.status === 'closed'
                ? 'Results are being finalized…'
                : 'Stay tuned — the podium appears when judging closes.'}
            </p>
          </div>
        )}
      </section>

      {/* ── Sponsor strip ──────────────────────────────────── */}
      {data.sponsors.length > 0 && (
        <section className="shrink-0 overflow-hidden border-t border-slate-800 bg-slate-900/60 py-2 md:py-3">
          <div className="mb-1 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500 md:text-xs">
            Sponsors
          </div>
          <div className="hcc-marquee-track hcc-marquee-slow items-center gap-12">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex items-center gap-12" aria-hidden={copy === 1}>
                {data.sponsors.map((sp, i) => (
                  <span
                    key={`${copy}-${i}`}
                    className="flex items-center gap-2 whitespace-nowrap text-base font-bold text-slate-300 md:text-xl"
                  >
                    {sp.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sp.logo_url}
                        alt={sp.name}
                        className="h-7 w-auto object-contain md:h-9"
                      />
                    ) : null}
                    {sp.name}
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                      {sp.tier}
                    </span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Footer (hidden in kiosk) ───────────────────────── */}
      {!kiosk && (
        <footer className="shrink-0 border-t border-slate-800 bg-slate-950 py-2 text-center text-xs text-slate-500">
          Powered by <span className="font-semibold text-slate-400">HackathonOS</span> · refreshing
          every 15s
        </footer>
      )}
    </div>
  );
}
