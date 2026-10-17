'use client';

import { useEffect, useState } from 'react';

const TIERS = ['platinum', 'gold', 'silver'];

interface Sponsor {
  id: string;
  name: string;
  logo_url: string;
  tier: string;
  website: string;
}

const emptyForm = { name: '', logo_url: '', tier: 'silver', website: '' };

export default function SponsorsClient({ eventId }: { eventId: string }) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const res = await fetch(`/api/events/${eventId}/sponsors`);
    if (res.ok) {
      const data = await res.json();
      setSponsors(data.sponsors ?? []);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  function startEdit(s: Sponsor) {
    setEditingId(s.id);
    setForm({ name: s.name, logo_url: s.logo_url, tier: s.tier, website: s.website });
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  }

  async function save() {
    setError('');
    if (!form.name.trim()) {
      setError('Sponsor name is required.');
      return;
    }
    setBusy(true);
    try {
      const url = editingId
        ? `/api/events/${eventId}/sponsors/${editingId}`
        : `/api/events/${eventId}/sponsors`;
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to save sponsor.');
        return;
      }
      cancelEdit();
      await load();
    } catch {
      setError('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Remove this sponsor?')) return;
    const res = await fetch(`/api/events/${eventId}/sponsors/${id}`, { method: 'DELETE' });
    if (res.ok) await load();
  }

  const input =
    'w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800';

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">{editingId ? 'Edit sponsor' : 'Add sponsor'}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Name *</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={input}
              placeholder="Acme Corp"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Tier</span>
            <select
              value={form.tier}
              onChange={(e) => setForm({ ...form, tier: e.target.value })}
              className={input}
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t[0].toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Logo URL</span>
            <input
              value={form.logo_url}
              onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
              className={input}
              placeholder="https://…/logo.png"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Website</span>
            <input
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className={input}
              placeholder="https://acme.com"
            />
          </label>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            onClick={save}
            disabled={busy}
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
          >
            {busy ? 'Saving…' : editingId ? 'Save changes' : 'Add sponsor'}
          </button>
          {editingId && (
            <button onClick={cancelEdit} className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm dark:border-zinc-700">
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">Sponsors ({sponsors.length})</h2>
        {sponsors.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            None yet. Sponsors appear on the public event page once added.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
            {sponsors.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {s.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.logo_url} alt={s.name} className="h-10 w-10 rounded object-contain" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-zinc-100 text-sm font-bold dark:bg-zinc-800">
                      {s.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="text-xs capitalize text-zinc-500">{s.tier}</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => startEdit(s)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(s.id)}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 dark:border-red-900"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
