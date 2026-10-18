'use client';

import { useEffect, useState } from 'react';
import { Card, Button, ErrorNote } from '@/components/ui';
import AnnouncementBadge from '@/components/AnnouncementBadge';
import type { AnnouncementRow } from '@/lib/announcement-columns';

/**
 * Organizer announcements center. Mounted on the event manage page and on
 * the dedicated /dashboard/events/[id]/announcements page. Posts flow to
 * the public live command center (/e/[slug]/live) ticker; type='deadline'
 * announcements also render in the live screen's alert banner.
 */
export default function AnnouncementsForm({ eventId }: { eventId: string }) {
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    const res = await fetch(`/api/events/${eventId}/announcements`);
    if (res.ok) {
      const data = await res.json();
      setAnnouncements(data.announcements ?? []);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function post() {
    setError('');
    if (!message.trim()) {
      setError('Write something before posting.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          type,
          pinned,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to post announcement.');
        return;
      }
      setTitle('');
      setMessage('');
      setType('info');
      setPinned(false);
      await load();
    } catch {
      setError('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function togglePin(id: string, next: boolean) {
    const res = await fetch(`/api/events/${eventId}/announcements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: next }),
    });
    if (res.ok) await load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this announcement?')) return;
    const res = await fetch(`/api/events/${eventId}/announcements/${id}`, { method: 'DELETE' });
    if (res.ok) await load();
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900">📣 Post announcement</h2>
        <p className="mt-1 text-sm text-slate-500">
          Shown on the public event page and the live command center ticker. Pinned items float to
          the top; deadline types also show in the live screen&rsquo;s alert banner.
        </p>
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              placeholder="Title (optional) — e.g. “Dinner is served”"
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              aria-label="Announcement type"
            >
              <option value="info">ℹ️ Info</option>
              <option value="deadline">⚠️ Deadline</option>
              <option value="winner">🏆 Winner</option>
            </select>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            rows={3}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            placeholder="e.g. Pizza is here! Grab a slice in the lobby 🍕"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
              />
              📌 Pin to top
            </label>
            <p className="text-xs text-slate-400">{message.length}/500</p>
            <Button onClick={post} disabled={busy || !message.trim()}>
              {busy ? 'Posting…' : 'Post announcement'}
            </Button>
          </div>
        </div>
        <ErrorNote message={error || null} />
      </Card>

      <Card className="p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900">All ({announcements.length})</h2>
        {announcements.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            No announcements yet. Post one above and it appears on the live screen within 15
            seconds.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {announcements.map((a) => (
              <li key={a.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {a.pinned === 1 && <span className="text-sm" aria-label="Pinned">📌</span>}
                    <AnnouncementBadge type={a.type} />
                    <p className="text-xs text-slate-400">
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                  </div>
                  {a.title && <p className="mt-1 font-bold text-slate-900">{a.title}</p>}
                  <p className="mt-0.5 text-slate-700">{a.message}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => togglePin(a.id, a.pinned !== 1)}
                    className="rounded-xl border border-indigo-200 px-3 py-1.5 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
                  >
                    {a.pinned === 1 ? 'Unpin' : 'Pin'}
                  </button>
                  <button
                    onClick={() => remove(a.id)}
                    className="rounded-xl border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    Delete
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
