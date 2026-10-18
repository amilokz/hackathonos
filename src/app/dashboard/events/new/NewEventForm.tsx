'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Field, inputClass, ErrorNote } from '@/components/ui';
import ImageUpload from '@/components/ImageUpload';

export default function NewEventForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    logo_url: '',
    cover_url: '',
    start_date: '',
    end_date: '',
    entry_fee: '0',
  });

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setError('End date must be on or after the start date.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, entry_fee: Number(form.entry_fee) || 0 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not create event');
        return;
      }
      router.push(`/dashboard/events/${data.id}`);
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
        <Field label="Event name">
          <input value={form.name} onChange={(e) => set('name', e.target.value)} className={inputClass} placeholder="AI Seekho Hackathon 2026" required minLength={2} />
        </Field>
        <Field label="Description" hint="Shown on the public event page.">
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} className={`${inputClass} min-h-24`} placeholder="A 2-day AI hackathon for students and builders…" />
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
          <Field label="Logo (optional)">
            <ImageUpload value={form.logo_url} onChange={(url) => set('logo_url', url)} />
          </Field>
          <Field label="Cover banner (optional)" hint="Wide banner for the public page. You can also add it later from the event settings.">
            <ImageUpload value={form.cover_url} onChange={(url) => set('cover_url', url)} placeholder="https://…/cover.jpg" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Entry fee (0 = free)" hint="In your local currency.">
            <input type="number" min={0} step="any" value={form.entry_fee} onChange={(e) => set('entry_fee', e.target.value)} className={inputClass} />
          </Field>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create event'}</Button>
          <a href="/dashboard" className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:text-slate-700">Cancel</a>
        </div>
        <p className="text-xs text-slate-400">Default judging criteria (Innovation, Technical Execution, Impact, Presentation, Feasibility) are added automatically — you can edit them later.</p>
      </form>
    </Card>
  );
}
