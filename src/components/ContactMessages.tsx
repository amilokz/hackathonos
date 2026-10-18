'use client';

import { useState } from 'react';
import { Card } from '@/components/ui';

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
 * never exposed publicly.
 */
export default function ContactMessages({ initial }: { initial: ContactMessage[] }) {
  const [messages, setMessages] = useState<ContactMessage[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const unreadCount = messages.filter((m) => !m.read).length;

  async function toggleRead(msg: ContactMessage) {
    if (busy) return;
    setBusy(msg.id);
    const nextRead = !msg.read;
    // Optimistic update.
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, read: nextRead ? 1 : 0 } : m)));
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
    } finally {
      setBusy(null);
    }
  }

  if (messages.length === 0) {
    return (
      <Card className="p-10 text-center">
        <span className="text-4xl" aria-hidden="true">
          📭
        </span>
        <p className="mt-3 font-bold text-slate-900">No messages yet</p>
        <p className="mt-1 text-sm text-slate-500">
          Submissions from the public{' '}
          <a href="/contact" className="font-semibold text-indigo-600 hover:underline">
            contact page
          </a>{' '}
          will appear here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <p className="text-sm text-slate-500">
          <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
            {unreadCount} unread
          </span>
        </p>
      )}
      {messages.map((m) => {
        const isUnread = !m.read;
        const toggling = busy === m.id;
        return (
          <Card
            key={m.id}
            className={`p-5 sm:p-6 transition ${isUnread ? 'border-indigo-300 ring-1 ring-indigo-100' : ''}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900">{m.name}</h3>
                  {isUnread && (
                    <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                      New
                    </span>
                  )}
                </div>
                <a
                  href={`mailto:${m.email}`}
                  className="mt-0.5 block truncate text-sm font-medium text-indigo-600 hover:underline"
                >
                  {m.email}
                </a>
                {m.subject && <p className="mt-1 text-sm font-semibold text-slate-700">{m.subject}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <time className="text-xs text-slate-400" title={m.created_at}>
                  {formatDate(m.created_at)}
                </time>
                <button
                  type="button"
                  onClick={() => toggleRead(m)}
                  disabled={toggling}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                    isUnread
                      ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {toggling ? '…' : isUnread ? 'Mark as read' : 'Mark unread'}
                </button>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{m.message}</p>
          </Card>
        );
      })}
    </div>
  );
}
