'use client';

import { useState } from 'react';

/** Joins a team by invite code: POSTs to /api/teams/join-by-code and reports the outcome. */
export default function JoinByCodeButton({
  code,
  teamId,
  slug,
}: {
  code: string;
  teamId: string;
  slug: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  async function join() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/teams/join-by-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = data.loginUrl || '/p/login';
        return;
      }
      if (!res.ok) {
        setError(data.error || 'Could not join the team.');
        return;
      }
      setJoined(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (joined) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
        <p className="text-lg font-extrabold text-emerald-800">🎉 You&apos;re on the team!</p>
        <a
          href={`/e/${slug}/teams/${teamId}`}
          className="mt-2 inline-block text-sm font-bold text-emerald-700 underline hover:text-emerald-900"
        >
          View your team →
        </a>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={join}
        className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-base font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
      >
        {busy ? 'Joining…' : 'Join this team'}
      </button>
    </div>
  );
}
