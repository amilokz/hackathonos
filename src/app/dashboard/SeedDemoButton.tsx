'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * One-click demo data: creates 2 realistic closed past events (teams, projects,
 * judge scores, sponsors, certificates) so /past, leaderboards and certificates
 * can be demoed instantly. Only shown when the organizer has no events yet.
 */
export default function SeedDemoButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!window.confirm('This creates 2 sample past hackathons for demo. Continue?')) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/seed-demo', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not load sample events');
        return;
      }
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50/60 px-5 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60"
      >
        {busy ? 'Loading samples…' : '✨ Load sample past events'}
      </button>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      <p className="mt-2 text-xs text-slate-400">
        Adds 2 finished hackathons with teams, scores &amp; certificates — delete them anytime.
      </p>
    </div>
  );
}
