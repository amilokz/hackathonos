'use client';

import { useCallback, useEffect, useState } from 'react';

interface Entry {
  rank: number;
  title: string;
  team_name: string;
  judges: number;
  human_total: number | null;
  ai_overall: number | null;
}

function medal(rank: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

export default function Leaderboard({ slug }: { slug: string }) {
  const [eventName, setEventName] = useState('');
  const [isClosed, setIsClosed] = useState(false);
  const [whiteLabel, setWhiteLabel] = useState(false);
  const [footerText, setFooterText] = useState('');
  const [results, setResults] = useState<Entry[]>([]);
  const [updatedAt, setUpdatedAt] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/e/${slug}/leaderboard`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load leaderboard');
      setEventName(data.event.name);
      setIsClosed(data.event.status === 'closed');
      setWhiteLabel(Boolean(data.event.white_label));
      setFooterText((data.event.custom_footer_text ?? '').trim());
      setResults(data.results);
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

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 pb-8 pt-12 text-center">
        {isClosed ? (
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-700">
            🏁 Final results
          </p>
        ) : (
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
            Live leaderboard
          </p>
        )}
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight md:text-5xl">
          {eventName || '…'}
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
        <div className="space-y-4">
          {results.map((r) => (
            <div
              key={`${r.rank}-${r.title}`}
              className={`flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${
                r.rank === 1
                  ? 'border-amber-300 ring-2 ring-amber-200'
                  : r.rank <= 3
                    ? 'border-indigo-200'
                    : 'border-slate-200'
              }`}
            >
              <div className="w-16 text-center text-3xl font-extrabold text-slate-700">
                {medal(r.rank)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xl font-bold text-slate-900">{r.title}</div>
                <div className="text-sm text-slate-500">{r.team_name}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {r.judges > 0 ? `${r.judges} judge${r.judges === 1 ? '' : 's'}` : 'Awaiting scores'}
                  {r.ai_overall !== null && (
                    <span className="ml-3 rounded-full bg-violet-50 px-2 py-0.5 font-semibold text-violet-700">
                      🤖 AI {Math.round(r.ai_overall)}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                {r.human_total !== null ? (
                  <div className="text-4xl font-extrabold text-indigo-600 md:text-5xl">
                    {Math.round(r.human_total)}
                  </div>
                ) : (
                  <div className="text-2xl font-bold text-slate-300">—</div>
                )}
                <div className="text-xs text-slate-400">/ 100</div>
              </div>
            </div>
          ))}
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
