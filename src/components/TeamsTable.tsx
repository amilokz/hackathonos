'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

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

const STATUS_PILL: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-slate-200 text-slate-600',
};

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
 * Searchable team roster with status pills and per-row quick approve/reject
 * for pending teams. Rejected teams can be re-approved from here.
 */
export default function TeamsTable({ eventId }: { eventId: string }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [query, setQuery] = useState('');
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
      setTeams(data.teams as Team[]);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.contact_name || '').toLowerCase().includes(q) ||
        (t.contact_email || '').toLowerCase().includes(q),
    );
  }, [teams, query]);

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

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by team or contact name…"
          className="w-full max-w-xs rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <p className="text-xs text-slate-400">
          {filtered.length} of {teams.length} teams
        </p>
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-slate-500">Loading teams…</p>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}{' '}
          <button onClick={load} className="font-semibold underline">
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center">
          <p className="text-sm text-slate-500">
            {teams.length === 0 ? 'No teams registered yet.' : 'No teams match your search.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5 font-semibold">Team</th>
                <th className="px-4 py-2.5 font-semibold">Contact</th>
                <th className="px-4 py-2.5 font-semibold">Members</th>
                <th className="px-4 py-2.5 font-semibold">Registered</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-semibold text-slate-900">{t.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {t.contact_name || '—'}
                    <span className="block text-xs text-slate-400">{t.contact_email}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{memberCount(t)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDate(t.created_at)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                        STATUS_PILL[t.approval_status] ?? 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {t.approval_status || 'approved'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {t.approval_status === 'pending' ? (
                      <span className="inline-flex gap-1.5">
                        <button
                          type="button"
                          disabled={busyId === t.id}
                          onClick={() => decide(t.id, 'approve')}
                          className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          ✓ Approve
                        </button>
                        <button
                          type="button"
                          disabled={busyId === t.id}
                          onClick={() => decide(t.id, 'reject')}
                          className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </span>
                    ) : t.approval_status === 'rejected' ? (
                      <button
                        type="button"
                        disabled={busyId === t.id}
                        onClick={() => decide(t.id, 'approve')}
                        className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                      >
                        Re-approve
                      </button>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
