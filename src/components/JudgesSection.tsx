'use client';

import { useEffect, useState } from 'react';
import { Card, Button, Field, inputClass, ErrorNote, SuccessNote } from '@/components/ui';
import { DataTable, DsIcon, type DataTableColumn } from '@/components/design-system';

interface Judge {
  id: string;
  event_id: string;
  name: string;
  email: string;
  access_code: string;
  created_at: string;
}

/**
 * Organizer judge management section. Fully self-contained — the coordinator
 * mounts it wherever it belongs on the event manage page.
 *
 * Lets organizers add judges (name + email), copy each judge's access code
 * (which judges use at /judge/login), and remove judges.
 */
export default function JudgesSection({ eventId }: { eventId: string }) {
  const [judges, setJudges] = useState<Judge[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/judges`);
      const data = await res.json();
      if (res.ok) setJudges(data.judges ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function addJudge(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Judge name is required.');
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/events/${eventId}/judges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not add judge. Please try again.');
        return;
      }
      setJudges((j) => [...j, data.judge]);
      setNotice(`Judge added — access code: ${data.judge.access_code}`);
      setName('');
      setEmail('');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function removeJudge(judge: Judge) {
    if (!window.confirm(`Remove judge “${judge.name}”? They will no longer be able to sign in.`)) return;
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/events/${eventId}/judges/${judge.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not remove judge. Please try again.');
        return;
      }
      setJudges((j) => j.filter((x) => x.id !== judge.id));
      setNotice(`“${judge.name}” removed.`);
    } catch {
      setError('Network error. Please try again.');
    }
  }

  async function copyCode(judge: Judge) {
    try {
      await navigator.clipboard.writeText(judge.access_code);
      setCopied(judge.id);
      setTimeout(() => setCopied((id) => (id === judge.id ? null : id)), 1500);
    } catch {
      setError('Could not copy to clipboard.');
    }
  }

  const columns: DataTableColumn<Judge>[] = [
    {
      key: 'name',
      header: 'Judge',
      sortable: true,
      value: (j) => `${j.name} ${j.email ?? ''}`.toLowerCase(),
      render: (j) => (
        <span>
          <span className="block font-semibold text-[#111827]">{j.name}</span>
          {j.email && <span className="block truncate text-xs text-slate-500">{j.email}</span>}
        </span>
      ),
    },
    {
      key: 'code',
      header: 'Access code',
      render: (j) => (
        <button
          type="button"
          onClick={() => copyCode(j)}
          title="Copy access code"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-sm font-bold tracking-widest text-slate-800 transition hover:border-indigo-200 hover:bg-indigo-50"
        >
          {j.access_code}
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">
            <DsIcon name="copy" className="h-3 w-3" />
            {copied === j.id ? 'Copied' : 'Copy'}
          </span>
        </button>
      ),
    },
    {
      key: 'added',
      header: 'Added',
      sortable: true,
      value: (j) => j.created_at || '',
      render: (j) => (
        <span className="whitespace-nowrap text-xs text-slate-500">
          {j.created_at
            ? new Date(j.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (j) => (
        <button
          type="button"
          onClick={() => removeJudge(j)}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
        >
          <DsIcon name="trash" className="h-3.5 w-3.5" />
          Remove
        </button>
      ),
    },
  ];

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <DsIcon name="scale" className="h-5 w-5 text-indigo-600" />
            Judges
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Share each access code with its judge — they sign in at <span className="font-semibold">/judge/login</span>.
          </p>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
          {judges.length} judge{judges.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <ErrorNote message={error} />
        <SuccessNote message={notice} />
      </div>

      <form onSubmit={addJudge} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Judge name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="e.g. Ayesha Khan"
            maxLength={120}
          />
        </Field>
        <Field label="Email (optional)">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="judge@example.com"
            maxLength={200}
          />
        </Field>
        <Button type="submit" disabled={busy} className="sm:mb-[1px]">
          {busy ? 'Adding…' : <><DsIcon name="plus" className="h-4 w-4" /> Add judge</>}
        </Button>
      </form>

      <div className="mt-6">
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-400">Loading judges…</p>
        ) : (
          <DataTable
            columns={columns}
            rows={judges}
            searchable
            searchPlaceholder="Search judges…"
            emptyTitle="No judges yet"
            emptyText="Add your first judge above — their access code appears here."
          />
        )}
      </div>
    </Card>
  );
}
