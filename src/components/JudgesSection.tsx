'use client';

import { useEffect, useState } from 'react';
import { Card, Button, Field, inputClass, ErrorNote, SuccessNote } from '@/components/ui';

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
      setNotice(`Judge added ✓ — access code: ${data.judge.access_code}`);
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

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Judges</h2>
          <p className="text-sm text-slate-500">
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
          {busy ? 'Adding…' : '+ Add judge'}
        </Button>
      </form>

      <div className="mt-6">
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-400">Loading judges…</p>
        ) : judges.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-slate-600">No judges yet</p>
            <p className="mt-1 text-sm text-slate-500">Add your first judge above — their access code appears here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
            {judges.map((j) => (
              <li key={j.id} className="flex flex-wrap items-center gap-3 bg-white px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">{j.name}</p>
                  {j.email && <p className="truncate text-xs text-slate-500">{j.email}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => copyCode(j)}
                  title="Copy access code"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-sm font-bold tracking-widest text-slate-800 transition hover:border-indigo-200 hover:bg-indigo-50"
                >
                  {j.access_code}
                  <span className="text-xs font-semibold text-indigo-600">
                    {copied === j.id ? '✓ Copied' : '⧉ Copy'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => removeJudge(j)}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
