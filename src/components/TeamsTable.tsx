'use client';

import { useCallback, useEffect, useState } from 'react';
import { DataTable, StatusPill, DsIcon, type DataTableColumn } from '@/components/design-system';
import { Card } from '@/components/ui';

interface Team {
  id: string;
  name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  members_json: string;
  approval_status: string;
  looking_for: string | null;
  is_open: number | null;
  invite_code: string | null;
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
 * Searchable, sortable team roster with status pills and per-row
 * quick approve/reject for pending teams. Rejected teams can be
 * re-approved from here. Select "Finder" on a row to edit its
 * Team Finder settings in the panel below.
 */
export default function TeamsTable({ eventId }: { eventId: string }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Team Finder per-team settings
  const [finderTeam, setFinderTeam] = useState<Team | null>(null);
  const [lookingFor, setLookingFor] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [savingFinder, setSavingFinder] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  function openFinder(team: Team) {
    setFinderTeam((prev) => (prev?.id === team.id ? null : team));
    setLookingFor(team.looking_for ?? '');
    setIsOpen((team.is_open ?? 1) === 1);
    setError(null);
  }

  async function saveFinder(team: Team) {
    setSavingFinder(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/teams/${team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ looking_for: lookingFor.trim(), is_open: isOpen }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not save Team Finder settings.');
        return;
      }
      setTeams((prev) => prev.map((t) => (t.id === team.id ? { ...t, ...data.team } : t)));
      setFinderTeam(null);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSavingFinder(false);
    }
  }

  async function regenerateCode(team: Team) {
    setBusyId(team.id);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/teams/${team.id}/invite-code`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not regenerate the invite code.');
        return;
      }
      const updated = { ...team, invite_code: data.invite_code };
      setTeams((prev) => prev.map((t) => (t.id === team.id ? { ...t, invite_code: data.invite_code } : t)));
      setFinderTeam(updated);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function copyCode(team: Team) {
    if (!team.invite_code) return;
    try {
      await navigator.clipboard.writeText(team.invite_code);
      setCopiedId(team.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // clipboard unavailable (non-secure context) — the code is visible anyway
    }
  }

  const columns: DataTableColumn<Team>[] = [
    {
      key: 'name',
      header: 'Team',
      sortable: true,
      value: (t) => t.name.toLowerCase(),
      render: (t) => <span className="font-semibold text-[#111827]">{t.name}</span>,
    },
    {
      key: 'contact',
      header: 'Contact',
      value: (t) => `${t.contact_name} ${t.contact_email}`.toLowerCase(),
      render: (t) => (
        <span>
          <span className="block text-slate-600">{t.contact_name || '—'}</span>
          <span className="block text-xs text-slate-400">{t.contact_email}</span>
        </span>
      ),
    },
    {
      key: 'members',
      header: 'Members',
      sortable: true,
      value: (t) => memberCount(t),
      render: (t) => <span className="text-slate-600">{memberCount(t)}</span>,
    },
    {
      key: 'finder',
      header: 'Finder',
      value: (t) => ((t.is_open ?? 1) === 1 ? 'open' : 'closed'),
      render: (t) => <StatusPill status={(t.is_open ?? 1) === 1 ? 'open' : 'closed'} />,
    },
    {
      key: 'registered',
      header: 'Registered',
      sortable: true,
      value: (t) => t.created_at || '',
      render: (t) => <span className="whitespace-nowrap text-xs text-slate-500">{formatDate(t.created_at)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      value: (t) => t.approval_status || 'approved',
      render: (t) => <StatusPill status={t.approval_status || 'approved'} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (t) => (
        <span className="inline-flex gap-1.5">
          <button
            type="button"
            onClick={() => openFinder(t)}
            title="Team Finder settings"
            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
          >
            <DsIcon name="search" className="h-3 w-3" />
            Finder
          </button>
          {t.approval_status === 'pending' ? (
            <button
              type="button"
              disabled={busyId === t.id}
              onClick={() => decide(t.id, 'approve')}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              <DsIcon name="check" className="h-3 w-3" />
              Approve
            </button>
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
            <button
              type="button"
              disabled={busyId === t.id}
              onClick={() => decide(t.id, 'reject')}
              className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              Reject
            </button>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="py-6 text-center text-sm text-slate-500">Loading teams…</p>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}{' '}
          <button onClick={load} className="font-semibold underline">
            Retry
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={teams}
          searchable
          searchPlaceholder="Search by team or contact name…"
          emptyTitle="No teams registered yet"
          emptyText="Share the public registration link to get started."
        />
      )}

      {finderTeam && (
        <Card className="border-indigo-100 bg-indigo-50/40 p-5">
          <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-indigo-500">
            <DsIcon name="search" className="h-3.5 w-3.5" />
            Team Finder settings — {finderTeam.name}
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-slate-600">
                Looking for <span className="font-normal text-slate-400">(shown on the public Team Finder)</span>
              </label>
              <input
                type="text"
                value={lookingFor}
                onChange={(e) => setLookingFor(e.target.value)}
                maxLength={300}
                placeholder="e.g. Need a designer + backend dev"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600">Invite code</label>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <code className="rounded-lg bg-white px-3 py-2 font-mono text-sm font-bold tracking-wider text-indigo-700 shadow-sm">
                  {finderTeam.invite_code || '—'}
                </code>
                <button
                  type="button"
                  onClick={() => copyCode(finderTeam)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  <DsIcon name="copy" className="h-3 w-3" />
                  {copiedId === finderTeam.id ? 'Copied' : 'Copy'}
                </button>
                <button
                  type="button"
                  disabled={busyId === finderTeam.id}
                  onClick={() => regenerateCode(finderTeam)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  {busyId === finderTeam.id ? '…' : 'Regenerate'}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Share the code with people you want to invite — they join instantly at{' '}
                <span className="font-mono">/e/&lt;event&gt;/join/&lt;code&gt;</span>
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={isOpen}
                onChange={(e) => setIsOpen(e.target.checked)}
                className="h-4 w-4 rounded accent-indigo-600"
              />
              Open to join <span className="font-normal text-slate-400">(appears in the public Team Finder)</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={savingFinder}
                onClick={() => saveFinder(finderTeam)}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingFinder ? 'Saving…' : 'Save settings'}
              </button>
              <button
                type="button"
                onClick={() => setFinderTeam(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
