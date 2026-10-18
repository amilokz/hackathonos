'use client';

import { useState } from 'react';
import { DsIcon } from '@/components/ui';

/** "Request to join" button for a team card: POSTs a join request, handles 401/409 gracefully. */
export default function RequestJoinButton({ teamId, teamName }: { teamId: string; teamName: string }) {
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/join-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = data.loginUrl || '/p/login';
        return;
      }
      if (!res.ok) {
        setError(data.error || 'Could not send the request.');
        return;
      }
      setSent(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
        <DsIcon name="clock" className="h-3.5 w-3.5" />
        Request pending
      </span>
    );
  }

  return (
    <div className="w-full">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-700"
        >
          Request to join
        </button>
      ) : (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
          <p className="text-xs font-bold text-slate-700">
            Request to join <span className="text-indigo-700">{teamName}</span>
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Introduce yourself — your skills, what you'd love to work on… (optional)"
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          {error && <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={send}
              className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? 'Sending…' : 'Send request'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
