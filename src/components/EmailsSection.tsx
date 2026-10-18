'use client';

import { useEffect, useState } from 'react';
import { Card, Button, ErrorNote } from '@/components/ui';
import { DataTable, StatusPill, DsIcon, type DataTableColumn } from '@/components/design-system';
import type { EmailLogRow } from '@/app/api/events/[id]/emails/route';

function statusLabel(status: string): string {
  if (status === 'sent') return 'Sent';
  if (status === 'skipped_no_key') return 'Skipped (no key)';
  return status.startsWith('failed:') ? 'Failed' : status;
}

/**
 * Organizer email center. Mounted on the event manage page.
 * Broadcasts + deadline reminders go to all approved teams' contact
 * emails; every send is recorded in the email log below.
 */
export default function EmailsSection({ eventId }: { eventId: string }) {
  const [emails, setEmails] = useState<EmailLogRow[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<'broadcast' | 'deadline' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    try {
      const res = await fetch(`/api/events/${eventId}/emails`);
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails ?? []);
      }
    } catch {
      /* log is non-critical */
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  function resultLine(data: { ok: boolean; total: number; sent: number; skipped: number; failed: number }): string {
    if (data.skipped > 0 && data.sent === 0) {
      return `Queued ${data.total} email${data.total === 1 ? '' : 's'} (logged, not delivered — no Resend key configured).`;
    }
    return `Done: ${data.sent} sent, ${data.skipped} skipped, ${data.failed} failed (${data.total} recipients).`;
  }

  async function sendBroadcast() {
    setError('');
    setNotice('');
    if (!subject.trim()) {
      setError('Give your broadcast a subject.');
      return;
    }
    if (!message.trim()) {
      setError('Write a message before sending.');
      return;
    }
    setBusy('broadcast');
    try {
      const res = await fetch(`/api/events/${eventId}/emails/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to send broadcast.');
        return;
      }
      setSubject('');
      setMessage('');
      setNotice(resultLine(data));
      await load();
    } catch {
      setError('Failed to send broadcast — check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  async function sendDeadlineReminder() {
    setError('');
    setNotice('');
    setBusy('deadline');
    try {
      const res = await fetch(`/api/events/${eventId}/emails/deadline-reminder`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to send deadline reminder.');
        return;
      }
      setNotice(`Deadline reminder ${resultLine(data).replace('Done: ', '')} Deadline: ${data.deadline}.`);
      await load();
    } catch {
      setError('Failed to send deadline reminder — check your connection and try again.');
    } finally {
      setBusy(null);
    }
  }

  const columns: DataTableColumn<EmailLogRow>[] = [
    {
      key: 'to',
      header: 'To',
      sortable: true,
      value: (e) => (e.to_email || '').toLowerCase(),
      render: (e) => (
        <span className="block max-w-[220px] truncate text-slate-700" title={e.to_email}>
          {e.to_email}
        </span>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      sortable: true,
      value: (e) => (e.subject || '').toLowerCase(),
      render: (e) => (
        <span className="block max-w-[260px] truncate text-slate-700" title={e.subject}>
          {e.subject}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      value: (e) => e.type || '',
      render: (e) => <StatusPill status={e.type || 'info'} />,
    },
    {
      key: 'status',
      header: 'Status',
      value: (e) => statusLabel(e.status),
      render: (e) => <StatusPill status={statusLabel(e.status)} />,
    },
    {
      key: 'time',
      header: 'Time',
      sortable: true,
      value: (e) => e.sent_at || '',
      render: (e) => (
        <span className="whitespace-nowrap text-xs text-slate-400">
          {e.sent_at ? new Date(e.sent_at).toLocaleString() : '—'}
        </span>
      ),
    },
  ];

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <DsIcon name="mail" className="h-5 w-5 text-indigo-600" />
        Emails
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Email all approved teams. Broadcasts are limited to one per 5 minutes; every send is logged below.
      </p>

      {error && (
        <div className="mt-3">
          <ErrorNote message={error} />
        </div>
      )}
      {notice && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {notice}
        </div>
      )}

      {/* Broadcast composer */}
      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-400">Subject</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Venue change for the finale"
            maxLength={160}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-bold uppercase tracking-widest text-slate-400">Message</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your update for all approved teams…"
            rows={4}
            maxLength={5000}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button onClick={sendBroadcast} disabled={busy !== null}>
            {busy === 'broadcast' ? (
              'Sending…'
            ) : (
              <>
                <DsIcon name="send" className="h-4 w-4" /> Send broadcast
              </>
            )}
          </Button>
          <Button variant="secondary" onClick={sendDeadlineReminder} disabled={busy !== null}>
            {busy === 'deadline' ? (
              'Sending…'
            ) : (
              <>
                <DsIcon name="clock" className="h-4 w-4" /> Send deadline reminder
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Email log */}
      <h3 className="mb-2 mt-6 font-semibold text-slate-900">Email log</h3>
      <DataTable
        columns={columns}
        rows={emails}
        searchable
        searchPlaceholder="Search by recipient or subject…"
        emptyTitle="No emails sent yet"
        emptyText="Broadcasts, deadline reminders and registration confirmations will appear here."
      />
    </Card>
  );
}
