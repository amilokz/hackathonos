'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { brandVars, brandName } from '@/lib/brand';

interface CriterionAverage {
  criterion: string;
  average: number;
}

interface Entry {
  rank: number;
  title: string;
  team_name: string;
  judges: number;
  human_total: number | null;
  ai_overall: number | null;
  criterion_averages: CriterionAverage[];
}

interface JudgingProgress {
  scored: number;
  total: number;
  pct: number;
}

function medal(rank: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

const PODIUM_STYLE: Record<number, { card: string; delay: string }> = {
  1: {
    card: 'bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 text-amber-950 ring-amber-300',
    delay: '0.25s',
  },
  2: {
    card: 'bg-gradient-to-br from-slate-100 via-slate-200 to-slate-400 text-slate-800 ring-slate-300',
    delay: '0.05s',
  },
  3: {
    card: 'bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 text-white ring-amber-500',
    delay: '0.45s',
  },
};

export default function Leaderboard({ slug }: { slug: string }) {
  const [eventName, setEventName] = useState('');
  const [brandColor, setBrandColor] = useState('#4F46E5');
  const [brandDisplayName, setBrandDisplayName] = useState('');
  const [brandLogoUrl, setBrandLogoUrl] = useState('');
  const [isClosed, setIsClosed] = useState(false);
  const [whiteLabel, setWhiteLabel] = useState(false);
  const [footerText, setFooterText] = useState('');
  const [results, setResults] = useState<Entry[]>([]);
  const [judging, setJudging] = useState<JudgingProgress | null>(null);
  const [updatedAt, setUpdatedAt] = useState('');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/e/${slug}/leaderboard`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load leaderboard');
      setEventName(data.event.name);
      setBrandColor(data.event.brand_color ?? '#4F46E5');
      setBrandDisplayName(brandName(data.event.brand_name ?? '', data.event.name));
      setBrandLogoUrl((data.event.brand_logo_url ?? '').trim());
      setIsClosed(data.event.status === 'closed');
      setWhiteLabel(Boolean(data.event.white_label));
      setFooterText((data.event.custom_footer_text ?? '').trim());
      setResults(data.results);
      setJudging(data.judging_progress ?? null);
      setUpdatedAt(data.updated_at);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  }, [slug]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000); // auto-refresh every 30s
    return () => clearInterval(timer);
  }, [load]);

  const podium = results.filter((r) => r.human_total !== null).slice(0, 3);
  const rest = results.filter((r) => !podium.includes(r));

  return (
    <div
      className="flex min-h-screen flex-col bg-slate-50 text-slate-900"
      style={brandVars(brandColor) as CSSProperties}
    >
      <style>{`
        @keyframes lb-rise { 0% { transform: translateY(70px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        .lb-rise { animation: lb-rise 0.9s cubic-bezier(0.22, 1, 0.36, 1) both; }
      `}</style>

      <header className="border-b border-slate-200 bg-white px-4 pb-8 pt-12 text-center">
        {brandLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brandLogoUrl} alt={`${brandDisplayName} logo`} className="mx-auto mb-4 h-14 w-14 rounded-2xl object-contain" />
        ) : null}
        {isClosed ? (
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-700">
            🏁 Final results
          </p>
        ) : (
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-[rgb(var(--brand-rgb)/0.08)] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[var(--brand-dark)]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--brand)]" />
            Live leaderboard
          </p>
        )}
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight md:text-5xl">
          {brandDisplayName || eventName || '…'}
        </h1>
        {updatedAt && (
          <p className="mt-3 text-xs text-slate-500">
            Updated {new Date(updatedAt).toLocaleTimeString()} · refreshes every 30s
          </p>
        )}
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
            {error}
          </div>
        )}
        {!error && results.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <p className="text-4xl">🏁</p>
            <p className="mt-4 text-lg font-bold text-slate-900">No scores yet</p>
            <p className="mt-1 text-sm text-slate-500">Check back once judging begins.</p>
          </div>
        )}

        {/* ── Top-3 podium cards ─────────────────────────── */}
        {!error && podium.length > 0 && (
          <div className="mb-10">
            <div className="flex items-end justify-center gap-3 md:gap-5">
              {podium.map((r) => {
                const s = PODIUM_STYLE[r.rank];
                return (
                  <div
                    key={`podium-${r.rank}-${r.title}`}
                    className={`lb-rise w-40 rounded-3xl p-5 text-center shadow-lg ring-2 md:w-56 md:p-6 ${s.card}`}
                    style={{ animationDelay: s.delay }}
                  >
                    <div className="text-4xl md:text-6xl">{medal(r.rank)}</div>
                    <div className="mt-3 truncate text-base font-black md:text-xl" title={r.title}>
                      {r.title}
                    </div>
                    <div
                      className="truncate text-xs font-medium opacity-80 md:text-sm"
                      title={r.team_name}
                    >
                      {r.team_name}
                    </div>
                    <div className="mt-2 text-3xl font-black tabular-nums md:text-4xl">
                      {Math.round(r.human_total as number)}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-widest opacity-70 md:text-xs">
                      / 100
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Judging progress bar ───────────────────────── */}
        {!error && judging && judging.total > 0 && (
          <div className="mb-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-500 md:text-sm">
              <span>
                Judging {judging.pct}% · {judging.scored}/{judging.total} scores
              </span>
              <span className="text-[var(--brand)]">{judging.pct}%</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--brand)] to-[var(--brand-dark)] transition-all duration-1000"
                style={{ width: `${judging.pct}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Ranked rows (4+) with expandable breakdown ──── */}
        <div className="space-y-4">
          {rest.map((r) => {
            const isOpen = expanded === r.rank;
            const scored = r.human_total !== null;
            return (
              <div
                key={`${r.rank}-${r.title}`}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => scored && setExpanded(isOpen ? null : r.rank)}
                  aria-expanded={scored ? isOpen : undefined}
                  className={`flex w-full items-center gap-4 p-5 text-left ${
                    scored ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div className="w-14 shrink-0 text-center text-2xl font-extrabold text-slate-700 md:text-3xl">
                    {medal(r.rank)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-bold text-slate-900 md:text-xl">
                      {r.title}
                    </div>
                    <div className="text-sm text-slate-500">{r.team_name}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {scored ? (
                        <>
                          {r.judges} judge{r.judges === 1 ? '' : 's'}
                        </>
                      ) : (
                        'Awaiting scores'
                      )}
                      {r.ai_overall !== null && (
                        <span className="ml-3 rounded-full bg-violet-50 px-2 py-0.5 font-semibold text-violet-700">
                          🤖 AI {Math.round(r.ai_overall)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {scored ? (
                      <>
                        <div className="text-3xl font-extrabold text-[var(--brand)] md:text-4xl">
                          {Math.round(r.human_total as number)}
                        </div>
                        <div className="text-xs text-slate-400">/ 100</div>
                      </>
                    ) : (
                      <div className="text-2xl font-bold text-slate-300">—</div>
                    )}
                  </div>
                  {scored && (
                    <span
                      className={`shrink-0 text-slate-400 transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    >
                      ▾
                    </span>
                  )}
                </button>
                {scored && isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Criterion breakdown · average judge score
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {r.criterion_averages.map((ca) => (
                        <span
                          key={ca.criterion}
                          title={`Average judge score: ${ca.average.toFixed(1)} / 10`}
                          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                        >
                          {ca.criterion}
                          <span className="font-black text-[var(--brand)]">
                            {Math.round(ca.average * 10)}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {whiteLabel ? (
        footerText ? (
          <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-400">
            {footerText}
          </footer>
        ) : null
      ) : (
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-400">
          Powered by <span className="font-semibold text-slate-600">HackathonOS</span> · Built by{' '}
          <a href="https://akclnt.com" className="font-semibold text-indigo-600 hover:underline">
            AKCLNT
          </a>
        </footer>
      )}
    </div>
  );
}
