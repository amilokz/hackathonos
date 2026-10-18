'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DsIcon } from '@/components/design-system';

/**
 * Foolproof Publish/Unpublish toggle. Calls PATCH /api/events/[id] with
 * {status}, shows inline success/error feedback, and refreshes the page
 * so the button label always reflects the NEW status from the server.
 *
 * `size="lg"` — the big prominent button on the event manage page.
 * `size="sm"` — the compact quick-action on dashboard event cards.
 * Clicks stopPropagation so they never trigger a surrounding card link.
 */
export default function PublishToggle({
  eventId,
  status: initialStatus,
  size = 'lg',
}: {
  eventId: string;
  status: string;
  size?: 'lg' | 'sm';
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const published = status === 'published';

  async function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (busy) return;
    const next = published ? 'draft' : 'published';
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ kind: 'err', text: data.error || 'Could not update status. Please try again.' });
        return;
      }
      const newStatus: string = data.event?.status ?? next;
      setStatus(newStatus);
      setMessage({
        kind: 'ok',
        text:
          newStatus === 'published'
            ? 'Event is live — participants can now register.'
            : 'Event unpublished — the public page is now offline.',
      });
      router.refresh();
    } catch {
      setMessage({ kind: 'err', text: 'Network error. Please try again.' });
    } finally {
      setBusy(false);
    }
  }

  const largeStyles = published
    ? 'bg-amber-500 text-white hover:bg-amber-600'
    : 'bg-emerald-600 text-white hover:bg-emerald-700';
  const smallStyles = published
    ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
    : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100';

  return (
    <span className="inline-flex flex-col items-start gap-1.5" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={
          size === 'lg'
            ? `inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${largeStyles}`
            : `inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${smallStyles}`
        }
      >
        {busy ? (
          'Working…'
        ) : published ? (
          <>
            <DsIcon name="pause" className="h-4 w-4" /> Unpublish
          </>
        ) : (
          <>
            <DsIcon name="rocket" className="h-4 w-4" /> Publish event
          </>
        )}
      </button>
      {message && (
        <span
          className={`text-xs font-medium ${message.kind === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}
        >
          {message.text}
        </span>
      )}
    </span>
  );
}
