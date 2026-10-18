'use client';

import { useState } from 'react';

export interface PendingRequest {
  id: string;
  message: string | null;
  created_at: string;
  participant_id: string;
  name: string;
  email: string;
  skills: string | null;
}

/** Accept/reject controls for pending join requests, for organizers or team members. */
export default function TeamRequests({
  teamId,
  requests,
}: {
  teamId: string;
  requests: PendingRequest[];
}) {
  const [items, setItems] = useState(requests);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(requestId: string, action: 'accept' | 'reject') {
    setBusyId(requestId);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/join-requests/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Action failed.');
        return;
      }
      setItems((prev) => prev.filter((r) => r.id !== requestId));
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return <p className="mt-3 text-sm text-slate-500">No pending requests. New requests will appear here.</p>;
  }

  return (
    <div className="mt-3 space-y-3">
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}
      {items.map((r) => (
        <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-bold text-slate-900">{r.name}</p>
              <p className="text-xs text-slate-400">{r.email}</p>
              {r.skills?.trim() && <p className="mt-1 text-xs text-slate-500">Skills: {r.skills}</p>}
            </div>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">pending</span>
          </div>
          {r.message?.trim() && (
            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm italic text-slate-600">“{r.message}”</p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busyId === r.id}
              onClick={() => decide(r.id, 'accept')}
              className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {busyId === r.id ? 'Working…' : '✓ Accept'}
            </button>
            <button
              type="button"
              disabled={busyId === r.id}
              onClick={() => decide(r.id, 'reject')}
              className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
