'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Field, inputClass, ErrorNote, SuccessNote } from '@/components/ui';
import ImageUpload from '@/components/ImageUpload';
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
    cover_url: event.cover_url ?? '',
    start_date: event.start_date,
    end_date: event.end_date,
    entry_fee: String(event.entry_fee),
    status: event.status,
    prizes: event.prizes ?? '',
    schedule: event.schedule ?? '',
    faq: event.faq ?? '',
    highlight_video_url: event.highlight_video_url ?? '',
  });

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setError('End date must be on or after the start date.');
      return;
    }
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
        <Field label="Cover banner" hint="Wide banner shown on the public event page (16:9 works best).">
          <ImageUpload value={form.cover_url} onChange={(url) => set('cover_url', url)} placeholder="https://…/cover.jpg" />
        </Field>
        <Field label="🏆 Prizes" hint="One per line, e.g. “1st — PKR 100,000 + trophy”. Shown in the Prizes section.">
          <textarea value={form.prizes} onChange={(e) => set('prizes', e.target.value)} className={`${inputClass} min-h-20`} placeholder="1st place — PKR 100,000 + trophy&#10;2nd place — PKR 50,000&#10;Best UI — PKR 10,000" />
        </Field>
        <Field label="🗓️ Schedule / agenda" hint="One per line, e.g. “Day 1, 09:00 — Check-in & opening”.">
          <textarea value={form.schedule} onChange={(e) => set('schedule', e.target.value)} className={`${inputClass} min-h-20`} placeholder="Day 1, 09:00 — Check-in & opening ceremony&#10;Day 1, 10:00 — Hacking begins" />
        </Field>
        <Field label="❓ FAQ" hint="Format: Question? on one line, answer on the next. Blank line between entries.">
          <textarea value={form.faq} onChange={(e) => set('faq', e.target.value)} className={`${inputClass} min-h-20`} placeholder="Who can join?&#10;Anyone — students, developers, designers.&#10;&#10;Is there a fee?&#10;No, entry is free." />
        </Field>
        <Field label="🎬 Highlight video (YouTube)" hint="YouTube link (watch or youtu.be). Shown as an embedded player on the public page.">
          <input value={form.highlight_video_url} onChange={(e) => set('highlight_video_url', e.target.value)} className={inputClass} placeholder="https://www.youtube.com/watch?v=…" />
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
          <Field label="Logo">
            <ImageUpload value={form.logo_url} onChange={(url) => set('logo_url', url)} />
          </Field>
          <Field label="Entry fee (0 = free)">
            <input type="number" min={0} step="any" value={form.entry_fee} onChange={(e) => set('entry_fee', e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="Status" hint="Published events accept registrations. Closed events keep a public page with the final results.">
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
