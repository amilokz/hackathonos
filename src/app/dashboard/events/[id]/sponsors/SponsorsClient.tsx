'use client';

import { useEffect, useState } from 'react';
import { Card, Button, Field, inputClass, ErrorNote } from '@/components/ui';
import ImageUpload from '@/components/ImageUpload';

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

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit sponsor' : 'Add sponsor'}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Name *">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
              placeholder="Acme Corp"
            />
          </Field>
          <Field label="Tier">
            <select
              value={form.tier}
              onChange={(e) => setForm({ ...form, tier: e.target.value })}
              className={inputClass}
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t[0].toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Logo">
            <ImageUpload
              value={form.logo_url}
              onChange={(url) => setForm({ ...form, logo_url: url })}
              placeholder="https://…/logo.png"
            />
          </Field>
          <Field label="Website">
            <input
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className={inputClass}
              placeholder="https://acme.com"
            />
          </Field>
        </div>
        <ErrorNote message={error || null} />
        <div className="mt-4 flex gap-2">
          <Button onClick={save} disabled={busy}>
            {busy ? 'Saving…' : editingId ? 'Save changes' : 'Add sponsor'}
          </Button>
          {editingId && (
            <Button variant="secondary" onClick={cancelEdit}>
              Cancel
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900">Sponsors ({sponsors.length})</h2>
        {sponsors.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            None yet. Sponsors appear on the public event page once added.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {sponsors.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {s.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.logo_url} alt={s.name} className="h-10 w-10 rounded object-contain" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-500">
                      {s.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{s.name}</p>
                    <p className="text-xs capitalize text-slate-500">{s.tier}</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => startEdit(s)}
                    className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(s.id)}
                    className="rounded-xl border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
