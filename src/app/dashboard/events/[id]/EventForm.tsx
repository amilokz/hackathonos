'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Field, inputClass, ErrorNote, SuccessNote } from '@/components/ui';
import type { EventRow } from '@/lib/types';

export default function EventForm({ event }: { event: EventRow }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: event.name,
    slug: event.slug,
    description: event.description,
    logo_url: event.logo_url,
    start_date: event.start_date,
    end_date: event.end_date,
    entry_fee: String(event.entry_fee),
    status: event.status,
  });

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, entry_fee: Number(form.entry_fee) || 0 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not save changes');
        return;
      }
      setSaved('Saved.');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <form onSubmit={onSubmit} className="space-y-4">
        <ErrorNote message={error} />
        <SuccessNote message={saved} />
        <Field label="Event name">
          <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputClass} required minLength={2} />
        </Field>
        <Field label="URL slug" hint="Public page lives at /e/this-slug. Changing it breaks old links.">
          <input value={form.slug} onChange={(e) => set('slug', e.target.value)} className={`${inputClass} font-mono`} required minLength={2} />
        </Field>
        <Field label="Description">
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} className={`${inputClass} min-h-24`} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Start date">
            <input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} className={inputClass} />
          </Field>
          <Field label="End date">
            <input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} className={inputClass} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Logo URL">
            <input value={form.logo_url} onChange={(e) => set('logo_url', e.target.value)} className={inputClass} placeholder="https://…" />
          </Field>
          <Field label="Entry fee (0 = free)">
            <input type="number" min={0} step="any" value={form.entry_fee} onChange={(e) => set('entry_fee', e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="Status" hint="Only published events accept registrations and show a public page.">
          <select value={form.status} onChange={(e) => set('status', e.target.value)} className={inputClass}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="closed">Closed</option>
          </select>
        </Field>
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
          <a href="/dashboard" className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700">Back</a>
        </div>
      </form>
    </Card>
  );
}
