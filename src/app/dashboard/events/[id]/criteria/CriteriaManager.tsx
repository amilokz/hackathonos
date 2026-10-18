'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Field, inputClass, ErrorNote } from '@/components/ui';
import { DsIcon } from '@/components/design-system';

interface Criterion {
  id: string;
  name: string;
  weight: number;
  description: string;
}

const PRESETS: Record<string, { name: string; weight: number; description: string }[]> = {
  'Hackathon standard': [
    { name: 'Innovation', weight: 25, description: 'How original and creative the idea is' },
    { name: 'Technical Execution', weight: 25, description: 'Quality of the implementation and demo' },
    { name: 'Impact', weight: 20, description: 'Real-world usefulness and potential' },
    { name: 'Presentation', weight: 15, description: 'Clarity of the pitch and demo' },
    { name: 'Feasibility', weight: 15, description: 'Can this be built and sustained' },
  ],
  'Pitch competition': [
    { name: 'Problem & Solution', weight: 30, description: 'Is the problem real and the solution fitting' },
    { name: 'Market Potential', weight: 25, description: 'Size and reach of the opportunity' },
    { name: 'Business Model', weight: 25, description: 'How it makes money' },
    { name: 'Team', weight: 20, description: 'Can this team execute' },
  ],
};

function WeightBadge({ weight }: { weight: number }) {
  return (
    <span className="shrink-0 rounded-xl bg-indigo-50 px-3 py-1.5 text-lg font-extrabold tabular-nums text-indigo-700">
      {weight}
      <span className="text-sm font-bold text-indigo-400">%</span>
    </span>
  );
}

export default function CriteriaManager({
  eventId,
  initial,
}: {
  eventId: string;
  initial: Criterion[];
}) {
  const router = useRouter();
  const [criteria, setCriteria] = useState<Criterion[]>(initial);
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('20');
  const [description, setDescription] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Criterion | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const total = criteria.reduce((n, c) => n + c.weight, 0);
  const balanced = total === 100;
  const over = total > 100;

  async function refresh() {
    const res = await fetch(`/api/events/${eventId}/criteria`);
    const data = await res.json();
    if (res.ok) setCriteria(data.criteria);
    router.refresh();
  }

  async function addCriterion(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}/criteria`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, weight: Number(weight), description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add');
      setName('');
      setWeight('20');
      setDescription('');
      setShowAdd(false);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`/api/criteria/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editing.name, weight: editing.weight, description: editing.description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setEditing(null);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this criterion? Existing scores for it will be removed too.')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/criteria/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function applyPreset(key: string) {
    if (criteria.length > 0 && !confirm('Replace current criteria with the preset?')) return;
    setError('');
    setBusy(true);
    try {
      for (const c of criteria) {
        await fetch(`/api/criteria/${c.id}`, { method: 'DELETE' });
      }
      for (const p of PRESETS[key]) {
        await fetch(`/api/events/${eventId}/criteria`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p),
        });
      }
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Total weight summary ─────────────────────────────── */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
              balanced
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                : over
                  ? 'bg-gradient-to-br from-red-500 to-rose-600'
                  : 'bg-gradient-to-br from-amber-400 to-orange-500'
            } text-white shadow-sm`}
          >
            <DsIcon name={balanced ? 'checkCircle' : 'alertTriangle'} className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tabular-nums text-slate-900">{total}</span>
              <span className="text-sm font-semibold text-slate-400">/ 100% total weight</span>
            </div>
            <div className="mt-2 h-2.5 w-full max-w-md overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  balanced
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    : over
                      ? 'bg-gradient-to-r from-red-500 to-rose-500'
                      : 'bg-gradient-to-r from-amber-400 to-orange-400'
                }`}
                style={{ width: `${Math.min(total, 100)}%` }}
              />
            </div>
            <p className={`mt-2 text-sm font-medium ${balanced ? 'text-emerald-700' : over ? 'text-red-600' : 'text-amber-700'}`}>
              {balanced
                ? 'Perfectly balanced — judges will score out of 100.'
                : over
                  ? `${total - 100}% over — reduce some weights so the total equals 100%.`
                  : `${100 - total}% remaining — add or increase weights to reach 100%.`}
            </p>
          </div>
        </div>
      </Card>

      <ErrorNote message={error || null} />

      {/* ── Criteria list ────────────────────────────────────── */}
      <div className="space-y-3">
        {criteria.map((c, i) => (
          <Card key={c.id} className="p-4 transition hover:border-indigo-200 hover:shadow-md sm:p-5">
            {editing?.id === c.id ? (
              <div className="grid gap-3">
                <Field label="Criterion name">
                  <input
                    className={inputClass}
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Weight %">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      className={inputClass}
                      value={editing.weight}
                      onChange={(e) => setEditing({ ...editing, weight: Number(e.target.value) })}
                    />
                  </Field>
                  <Field label="Description">
                    <input
                      className={inputClass}
                      placeholder="Description"
                      value={editing.description}
                      onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveEdit} disabled={busy}>
                    <DsIcon name="check" className="mr-1.5 h-4 w-4" />
                    Save
                  </Button>
                  <Button variant="secondary" onClick={() => setEditing(null)}>
                    <DsIcon name="x" className="mr-1.5 h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-extrabold text-white shadow-sm">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-slate-900">{c.name}</div>
                    {c.description && <div className="truncate text-sm text-slate-500">{c.description}</div>}
                  </div>
                  <WeightBadge weight={c.weight} />
                  <button
                    onClick={() => setEditing(c)}
                    title="Edit criterion"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    <DsIcon name="pencil" className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(c.id)}
                    title="Delete criterion"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <DsIcon name="trash" className="h-4 w-4" />
                  </button>
                </div>
                {/* Weight share bar */}
                <div className="mt-3 flex items-center gap-3 pl-12">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                      style={{ width: `${Math.min(c.weight, 100)}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-slate-400">
                    {total > 0 ? Math.round((c.weight / total) * 100) : 0}% of total
                  </span>
                </div>
              </div>
            )}
          </Card>
        ))}
        {criteria.length === 0 && (
          <Card className="p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
              <DsIcon name="scale" className="h-7 w-7" />
            </div>
            <p className="mt-4 font-bold text-slate-900">No criteria yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Add your first criterion below, or start from a proven preset.
            </p>
          </Card>
        )}
      </div>

      {/* ── Add criterion ────────────────────────────────────── */}
      {showAdd ? (
        <Card className="border-2 border-indigo-200 p-6 sm:p-8">
          <form onSubmit={addCriterion} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold text-slate-900">
                <DsIcon name="plus" className="h-5 w-5 text-indigo-600" />
                Add criterion
              </h2>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                title="Close"
              >
                <DsIcon name="x" className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <Field label="Criterion name">
                <input
                  className={inputClass}
                  placeholder="e.g. Innovation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                />
              </Field>
              <Field label="Weight %">
                <input
                  type="number"
                  min={1}
                  max={100}
                  className={inputClass}
                  placeholder="20"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  required
                />
              </Field>
            </div>
            <Field label="Description (optional)">
              <input
                className={inputClass}
                placeholder="What this criterion measures"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
                <DsIcon name="plus" className="mr-1.5 h-4 w-4" />
                {busy ? 'Adding…' : 'Add criterion'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/50 px-6 py-5 font-bold text-indigo-700 transition hover:border-indigo-400 hover:bg-indigo-50"
        >
          <DsIcon name="plus" className="h-5 w-5" />
          Add criterion
        </button>
      )}

      {/* ── Presets ──────────────────────────────────────────── */}
      <Card className="p-6">
        <h2 className="flex items-center gap-2 font-bold text-slate-900">
          <DsIcon name="sparkles" className="h-5 w-5 text-indigo-600" />
          Or start from a preset
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Proven judging rubrics used by top hackathons and pitch competitions.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.keys(PRESETS).map((key) => (
            <Button key={key} variant="secondary" onClick={() => applyPreset(key)} disabled={busy}>
              {key}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}
