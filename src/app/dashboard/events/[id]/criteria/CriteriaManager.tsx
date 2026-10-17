'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Field, inputClass, ErrorNote } from '@/components/ui';

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
  const [editing, setEditing] = useState<Criterion | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const total = criteria.reduce((n, c) => n + c.weight, 0);

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
      <div
        className={`rounded-xl border px-4 py-3 text-sm ${
          total === 100
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-amber-200 bg-amber-50 text-amber-700'
        }`}
      >
        Total weight: <strong>{total}%</strong>
        {total !== 100 && (
          <span> — weights should sum to 100% for fair scoring.</span>
        )}
      </div>

      <ErrorNote message={error || null} />

      <div className="space-y-3">
        {criteria.map((c) => (
          <Card key={c.id} className="p-4">
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
                  <Button onClick={saveEdit} disabled={busy}>Save</Button>
                  <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900">{c.name}</div>
                  {c.description && <div className="truncate text-sm text-slate-500">{c.description}</div>}
                </div>
                <span className="shrink-0 text-lg font-bold text-indigo-600">{c.weight}%</span>
                <button onClick={() => setEditing(c)} className="shrink-0 text-sm font-semibold text-indigo-600 hover:underline">
                  Edit
                </button>
                <button onClick={() => remove(c.id)} className="shrink-0 text-sm font-semibold text-red-600 hover:underline">
                  Delete
                </button>
              </div>
            )}
          </Card>
        ))}
        {criteria.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-sm text-slate-500">No criteria yet — add some below or pick a preset.</p>
          </Card>
        )}
      </div>

      <Card className="p-6 sm:p-8">
        <form onSubmit={addCriterion} className="space-y-4">
          <h2 className="font-bold text-slate-900">Add criterion</h2>
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <Field label="Criterion name">
              <input
                className={inputClass}
                placeholder="e.g. Innovation"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
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
          <Button type="submit" disabled={busy}>
            {busy ? 'Adding…' : 'Add criterion'}
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="font-bold text-slate-900">Or start from a preset</h2>
        <div className="mt-3 flex flex-wrap gap-2">
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
