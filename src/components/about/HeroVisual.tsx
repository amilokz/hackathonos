/**
 * Pure-CSS floating product visual for the About hero: a stylized live
 * leaderboard card (podium + ranked rows) with a "Built for TechKhwa" badge.
 * No external images.
 */

const LEADERS = [
  { rank: 2, team: 'MediQueue', score: 89, bar: 'h-16', bg: 'from-indigo-200 to-indigo-300' },
  { rank: 1, team: 'NeuroPark', score: 94, bar: 'h-24', bg: 'from-indigo-500 to-violet-600' },
  { rank: 3, team: 'AgriSense', score: 86, bar: 'h-12', bg: 'from-violet-200 to-violet-300' },
];

const ROWS = [
  { rank: 4, team: 'EduAR', project: 'Augmented Learning Platform', score: 81, pct: '81%' },
  { rank: 5, team: 'LogicLords', project: 'Smart Automation', score: 78, pct: '78%' },
  { rank: 6, team: 'PixelPioneers', project: 'VillageConnect', score: 74, pct: '74%' },
];

function CrownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-amber-400" fill="currentColor" aria-hidden="true">
      <path d="M2.5 7.5 6 11l6-6.5L18 11l3.5-3.5L20 18H4L2.5 7.5Z" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 text-indigo-600"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

export default function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none">
      {/* glow behind card */}
      <div
        aria-hidden="true"
        className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-indigo-400/30 via-violet-400/20 to-transparent blur-2xl"
      />
      <div className="relative rounded-3xl border border-white/60 bg-white/90 p-5 shadow-2xl shadow-indigo-600/15 backdrop-blur">
        {/* card header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100">
              <TrophyIcon />
            </span>
            <p className="text-sm font-extrabold text-slate-900">Live Leaderboard</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
            </span>
            LIVE
          </span>
        </div>

        {/* podium */}
        <div className="mt-5 flex items-end justify-center gap-3 rounded-2xl bg-gradient-to-b from-indigo-50/80 to-violet-50/40 px-6 pb-0 pt-6">
          {LEADERS.map((l) => (
            <div key={l.rank} className="flex w-20 flex-col items-center">
              {l.rank === 1 && <CrownIcon />}
              <p className="mt-1 text-xs font-bold text-slate-800">{l.team}</p>
              <p className={`text-sm font-extrabold ${l.rank === 1 ? 'text-indigo-700' : 'text-slate-600'}`}>
                {l.score}
              </p>
              <div
                className={`mt-1.5 w-full rounded-t-xl bg-gradient-to-b ${l.bg} ${l.bar} flex items-start justify-center pt-1.5`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-[11px] font-extrabold text-slate-700 shadow-sm">
                  {l.rank}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* ranked rows */}
        <ul className="mt-4 space-y-2.5">
          {ROWS.map((r) => (
            <li
              key={r.rank}
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm transition hover:border-indigo-200 hover:shadow"
            >
              <span className="w-5 text-center text-xs font-extrabold text-slate-400">{r.rank}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-xs font-bold text-slate-800">{r.team}</p>
                  <p className="text-xs font-extrabold text-indigo-600">{r.score}</p>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: r.pct }} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* floating badge */}
      <div className="absolute -top-4 right-2 rotate-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-center shadow-xl shadow-slate-900/25 transition hover:rotate-0 sm:-right-4">
        <p className="text-[11px] font-semibold text-slate-300">Built for</p>
        <p className="text-sm font-extrabold text-white">TechKhwa</p>
      </div>
    </div>
  );
}
