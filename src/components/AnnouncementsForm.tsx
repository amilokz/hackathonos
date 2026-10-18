'use client';

import { useEffect, useState } from 'react';
import { Card, Button, ErrorNote } from '@/components/ui';

interface Announcement {
  id: string;
  event_id: string;
  message: string;
  created_at: string;
}

/**
 * Organizer announcements panel. Mounted by the coordinator on the event
 * manage page. Posts flow to the public live command center (/e/[slug]/live).
 */
export default function AnnouncementsForm({ eventId }: { eventId: string }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [message, setMessage] = useState('');
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
        body: JSON.stringify({ message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to post announcement.');
        return;
      }
      setMessage('');
      await load();
    } catch {
      setError('Network error. Try again.');
    } finally {
      setBusy(false);
    }
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
          Shown on the public live command center ticker. Max 500 characters.
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          rows={3}
          className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          placeholder="e.g. Pizza is here! Grab a slice in the lobby 🍕"
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-slate-400">{message.length}/500</p>
          <Button onClick={post} disabled={busy || !message.trim()}>
            {busy ? 'Posting…' : 'Post announcement'}
          </Button>
        </div>
        <ErrorNote message={error || null} />
      </Card>

      <Card className="p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900">Recent ({announcements.length})</h2>
        {announcements.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            No announcements yet. Post one above and it appears on the live screen within 15
            seconds.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {announcements.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-slate-900">{a.message}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(a.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => remove(a.id)}
                  className="shrink-0 rounded-xl border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
