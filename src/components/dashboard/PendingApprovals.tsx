'use client';

import { useState } from 'react';
import { Card, DsIcon } from '@/components/ui';
import EmptyState from '@/components/EmptyState';
import { SectionHeader, DashIcon } from './icons';
import { timeAgo } from '@/lib/format';

export interface DashboardPendingTeam {
  id: string;
  name: string;
  contact_name: string;
  contact_email: string;
  event_id: string;
  event_name: string;
  created_at: string;
}

/**
 * Cross-event pending-approvals queue for the dashboard.
 * One-click Approve/Reject via the existing per-event approve API;
 * rows drop out of the list on success (optimistic, no refetch needed).
 */
export default function PendingApprovals({
  teams: initialTeams,
  total,
  viewAllHref,
}: {
  teams: DashboardPendingTeam[];
  total: number;
  viewAllHref?: string;
}) {
  const [teams, setTeams] = useState<DashboardPendingTeam[]>(initialTeams);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(team: DashboardPendingTeam, action: 'approve' | 'reject') {
    setBusyId(team.id);
    setError(null);
    try {
      const res = await fetch(`/api/events/${team.event_id}/teams/${team.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Action failed. Please try again.');
        return;
      }
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card className="p-6 transition hover:shadow-md">
      <SectionHeader
        icon="hourglass"
        tint="amber"
        title="Pending approvals"
        meta={
          teams.length > 0 ? (
            <p className="flex items-center gap-2 text-xs text-slate-400">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-800">
                {teams.length} awaiting review
              </span>
              {total > teams.length && (
                <span>
                  Showing {teams.length} of {total}
                </span>
              )}
            </p>
          ) : undefined
        }
        viewAllHref={viewAllHref}
      />

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {teams.length === 0 ? (
        <EmptyState
          icon={<DsIcon name="check" className="h-6 w-6" />}
          title="All caught up"
          text="No teams waiting for approval. New registrations that need review will appear here."
          compact
        />
      ) : (
        <ul className="space-y-2.5">
          {teams.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3.5 transition hover:border-amber-300 hover:bg-amber-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{t.name}</p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {t.event_name} · {t.contact_name || '—'} · {timeAgo(t.created_at)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busyId === t.id}
                  onClick={() => decide(t, 'approve')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  <DashIcon name="check" className="h-3.5 w-3.5" />
                  {busyId === t.id ? 'Working…' : 'Approve'}
                </button>
                <button
                  type="button"
                  disabled={busyId === t.id}
                  onClick={() => decide(t, 'reject')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <DashIcon name="x" className="h-3.5 w-3.5" />
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
