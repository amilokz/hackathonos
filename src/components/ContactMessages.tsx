'use client';

import { useState } from 'react';
import { Card } from '@/components/ui';
import { DataTable, StatusPill, DsIcon, type DataTableColumn } from '@/components/design-system';

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
  read: number;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/**
 * Organizer inbox for contact form submissions (newest first).
 * Read/unread toggling happens via PATCH /api/contact/[id]; messages are
 * never exposed publicly. Select a row to read the full message below.
 */
export default function ContactMessages({ initial }: { initial: ContactMessage[] }) {
  const [messages, setMessages] = useState<ContactMessage[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const unreadCount = messages.filter((m) => !m.read).length;

  async function toggleRead(msg: ContactMessage) {
    if (busy) return;
    setBusy(msg.id);
    const nextRead = !msg.read;
    // Optimistic update.
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, read: nextRead ? 1 : 0 } : m)));
    setSelected((prev) => (prev?.id === msg.id ? { ...prev, read: nextRead ? 1 : 0 } : prev));
    try {
      const res = await fetch(`/api/contact/${msg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: nextRead }),
      });
      if (!res.ok) throw new Error('failed');
    } catch {
      // Roll back on failure.
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, read: msg.read } : m))
      );
      setSelected((prev) => (prev?.id === msg.id ? msg : prev));
    } finally {
      setBusy(null);
    }
  }

  const columns: DataTableColumn<ContactMessage>[] = [
    {
      key: 'status',
      header: 'Status',
      value: (m) => (m.read ? 'read' : 'unread'),
      render: (m) => (m.read ? <StatusPill status="read" /> : <StatusPill status="new" />),
    },
    {
      key: 'from',
      header: 'From',
      sortable: true,
      value: (m) => `${m.name} ${m.email}`.toLowerCase(),
      render: (m) => (
        <span>
          <span className={`block ${m.read ? 'text-slate-700' : 'font-bold text-[#111827]'}`}>{m.name}</span>
          <a
            href={`mailto:${m.email}`}
            className="block truncate text-xs font-medium text-indigo-600 hover:underline"
          >
            {m.email}
          </a>
        </span>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      value: (m) => m.subject || '',
      render: (m) => (
        <span className="block max-w-[260px] truncate text-slate-700" title={m.subject || undefined}>
          {m.subject || '—'}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Received',
      sortable: true,
      value: (m) => m.created_at || '',
      render: (m) => (
        <time className="whitespace-nowrap text-xs text-slate-400" title={m.created_at}>
          {formatDate(m.created_at)}
        </time>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (m) => (
        <span className="inline-flex gap-1.5">
          <button
            type="button"
            onClick={() => setSelected((prev) => (prev?.id === m.id ? null : m))}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
          >
            <DsIcon name="eye" className="h-3.5 w-3.5" />
            Read
          </button>
          <button
            type="button"
            onClick={() => toggleRead(m)}
            disabled={busy === m.id}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
              m.read
                ? 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
            }`}
          >
            {busy === m.id ? '…' : m.read ? 'Mark unread' : 'Mark as read'}
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-5 sm:p-6">
        {unreadCount > 0 && (
          <p className="mb-3 text-sm text-slate-500">
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
              {unreadCount} unread
            </span>
          </p>
        )}
        <DataTable
          columns={columns}
          rows={messages}
          searchable
          searchPlaceholder="Search messages…"
          emptyTitle="No messages yet"
          emptyText="Submissions from the public contact page will appear here."
        />
      </Card>

      {selected && (
        <Card className="border-indigo-200 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#111827]">{selected.name}</h3>
                {!selected.read && <StatusPill status="new" />}
              </div>
              <a
                href={`mailto:${selected.email}`}
                className="mt-0.5 block truncate text-sm font-medium text-indigo-600 hover:underline"
              >
                {selected.email}
              </a>
              {selected.subject && <p className="mt-1 text-sm font-semibold text-slate-700">{selected.subject}</p>}
              <p className="mt-0.5 text-xs text-slate-400">{formatDate(selected.created_at)}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
            >
              <DsIcon name="x" className="h-3.5 w-3.5" />
              Close
            </button>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{selected.message}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={`mailto:${selected.email}?subject=${encodeURIComponent(`Re: ${selected.subject || 'Your message'}`)}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700"
            >
              <DsIcon name="mail" className="h-3.5 w-3.5" />
              Reply by email
            </a>
            <button
              type="button"
              onClick={() => toggleRead(selected)}
              disabled={busy === selected.id}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {busy === selected.id ? '…' : selected.read ? 'Mark unread' : 'Mark as read'}
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
