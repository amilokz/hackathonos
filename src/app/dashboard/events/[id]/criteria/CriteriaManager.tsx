'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Judging criteria</h1>
        <a href={`/dashboard/events/${eventId}/judging`} className="text-sm text-blue-600 hover:underline">
          → Go to judging
        </a>
      </div>

      <div
        className={`mb-6 p-4 rounded-lg border ${
          total === 100
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}
      >
        Total weight: <strong>{total}%</strong>
        {total !== 100 && (
          <span> — weights should sum to 100% for fair scoring.</span>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="space-y-3 mb-8">
        {criteria.map((c) => (
          <div key={c.id} className="flex items-center gap-3 p-4 bg-white border rounded-lg shadow-sm">
            {editing?.id === c.id ? (
              <div className="flex-1 grid gap-2">
                <input
                  className="border rounded px-2 py-1"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    className="border rounded px-2 py-1 w-24"
                    value={editing.weight}
                    onChange={(e) => setEditing({ ...editing, weight: Number(e.target.value) })}
                  />
                  <input
                    className="border rounded px-2 py-1 flex-1"
                    placeholder="Description"
                    value={editing.description}
                    onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={saveEdit} disabled={busy} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
                    Save
                  </button>
                  <button onClick={() => setEditing(null)} className="px-3 py-1 border rounded text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <div className="font-medium">{c.name}</div>
                  {c.description && <div className="text-sm text-gray-500">{c.description}</div>}
                </div>
                <span className="text-lg font-bold text-blue-700">{c.weight}%</span>
                <button onClick={() => setEditing(c)} className="text-sm text-blue-600 hover:underline">
                  Edit
                </button>
                <button onClick={() => remove(c.id)} className="text-sm text-red-600 hover:underline">
                  Delete
                </button>
              </>
            )}
          </div>
        ))}
        {criteria.length === 0 && (
          <p className="text-gray-500 text-sm">No criteria yet — add some below or pick a preset.</p>
        )}
      </div>

      <form onSubmit={addCriterion} className="p-4 bg-gray-50 border rounded-lg mb-8">
        <h2 className="font-semibold mb-3">Add criterion</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_100px]">
          <input
            className="border rounded px-3 py-2"
            placeholder="Criterion name (e.g. Innovation)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="number"
            min={1}
            max={100}
            className="border rounded px-3 py-2"
            placeholder="Weight %"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            required
          />
        </div>
        <input
          className="border rounded px-3 py-2 w-full mt-3"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button
          type="submit"
          disabled={busy}
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Add criterion
        </button>
      </form>

      <div className="p-4 bg-gray-50 border rounded-lg">
        <h2 className="font-semibold mb-3">Or start from a preset</h2>
        <div className="flex gap-3">
          {Object.keys(PRESETS).map((key) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              disabled={busy}
              className="px-4 py-2 border rounded hover:bg-white disabled:opacity-50 text-sm"
            >
              {key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
