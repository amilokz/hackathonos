'use client';

import { useCallback, useEffect, useState } from 'react';

interface Team {
  id: string;
  name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  members_json: string;
  approval_status: string;
  created_at: string;
}

function memberCount(t: Team): number {
  try {
    return (JSON.parse(t.members_json || '[]') as unknown[]).length;
  } catch {
    return 0;
  }
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Pending team approvals queue. Lists teams with approval_status='pending'
 * and offers one-click Approve/Reject. Refetches after each action.
 */
export default function PendingApprovals({ eventId }: { eventId: string }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/teams`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not load teams.');
        return;
      }
      setTeams((data.teams as Team[]).filter((t) => t.approval_status === 'pending'));
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(teamId: string, action: 'approve' | 'reject') {
    setBusyId(teamId);
    try {
      const res = await fetch(`/api/events/${eventId}/teams/${teamId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Action failed.');
        return;
      }
      await load();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="py-6 text-center text-sm text-slate-500">Loading pending teams…</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}{' '}
        <button onClick={load} className="font-semibold underline">
          Retry
        </button>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center">
        <p className="text-2xl">✅</p>
        <p className="mt-2 text-sm font-semibold text-slate-700">All caught up</p>
        <p className="mt-0.5 text-xs text-slate-500">No teams waiting for approval.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {teams.map((t) => (
        <div
          key={t.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4"
        >
          <div className="min-w-0">
            <p className="font-bold text-slate-900">{t.name}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {t.contact_name || '—'} · {t.contact_email || 'no email'} · {memberCount(t)}{' '}
              {memberCount(t) === 1 ? 'member' : 'members'} · {formatDate(t.created_at)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busyId === t.id}
              onClick={() => decide(t.id, 'approve')}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {busyId === t.id ? 'Working…' : '✓ Approve'}
            </button>
            <button
              type="button"
              disabled={busyId === t.id}
              onClick={() => decide(t.id, 'reject')}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
