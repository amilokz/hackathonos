'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PublishToggle from './PublishToggle';
import { DsIcon } from '@/components/design-system';

const BTN =
  'inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60';

/**
 * Quick actions for an event: publish toggle, close, duplicate, delete.
 * Mounted on the dashboard event rows/cards and on the manage page.
 */
export default function QuickActions({
  eventId,
  status: initialStatus,
  slug,
  eventName,
}: {
  eventId: string;
  status: string;
  slug: string;
  /** Needed for the delete type-to-confirm step; falls back to slug. */
  eventName?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteName, setDeleteName] = useState('');

  const nameToType = eventName ?? slug;

  async function closeEvent() {
    if (busy) return;
    if (!window.confirm('Close this event? Registrations stop and the leaderboard freezes with final results.')) {
      return;
    }
    setBusy('close');
    setMessage(null);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ kind: 'err', text: data.error || 'Could not close the event.' });
        return;
      }
      setStatus('closed');
      setMessage({ kind: 'ok', text: 'Event closed — registrations are now off.' });
      router.refresh();
    } catch {
      setMessage({ kind: 'err', text: 'Network error. Please try again.' });
    } finally {
      setBusy(null);
    }
  }

  async function duplicate() {
    if (busy) return;
    setBusy('duplicate');
    setMessage(null);
    try {
      const res = await fetch(`/api/events/${eventId}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ kind: 'err', text: data.error || 'Could not duplicate the event.' });
        return;
      }
      router.push(`/dashboard/events/${data.id}`);
    } catch {
      setMessage({ kind: 'err', text: 'Network error. Please try again.' });
    } finally {
      setBusy(null);
    }
  }

  async function deleteEvent() {
    if (busy || deleteName.trim() !== nameToType) return;
    setBusy('delete');
    setMessage(null);
    try {
      const res = await fetch(`/api/events/${eventId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ kind: 'err', text: data.error || 'Could not delete the event.' });
        setBusy(null);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    } catch {
      setMessage({ kind: 'err', text: 'Network error. Please try again.' });
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-2">
        <PublishToggle eventId={eventId} status={status} size="sm" />
        {status !== 'closed' && (
          <button
            type="button"
            onClick={closeEvent}
            disabled={busy !== null}
            className={`${BTN} border-slate-300 bg-white text-slate-600 hover:bg-slate-50`}
          >
            {busy === 'close' ? 'Closing…' : (<><DsIcon name="lock" className="h-3.5 w-3.5" /> Close event</>)}
          </button>
        )}
        <button
          type="button"
          onClick={duplicate}
          disabled={busy !== null}
          className={`${BTN} border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100`}
        >
          {busy === 'duplicate' ? 'Duplicating…' : '⧉ Duplicate'}
        </button>
        <button
          type="button"
          onClick={() => setConfirmingDelete((v) => !v)}
          disabled={busy !== null}
          className={`${BTN} border-red-200 bg-red-50 text-red-600 hover:bg-red-100`}
        >
          <DsIcon name="trash" className="h-3.5 w-3.5" /> Delete
        </button>
      </div>

      {confirmingDelete && (
        <div className="w-full rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-xs font-semibold text-red-800">
            This permanently deletes the event, all teams, projects, scores and certificates.
          </p>
          <p className="mt-1.5 text-xs text-red-700">
            Type <strong className="font-mono">{nameToType}</strong> to confirm:
          </p>
          <div className="mt-2 flex gap-2">
            <input
              value={deleteName}
              onChange={(e) => setDeleteName(e.target.value)}
              placeholder={nameToType}
              className="min-w-0 flex-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-red-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={deleteEvent}
              disabled={busy !== null || deleteName.trim() !== nameToType}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-40"
            >
              {busy === 'delete' ? 'Deleting…' : 'Confirm delete'}
            </button>
          </div>
        </div>
      )}

      {message && (
        <span className={`text-xs font-medium ${message.kind === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>
          {message.text}
        </span>
      )}
    </div>
  );
}
