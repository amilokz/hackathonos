'use client';

import { useEffect, useState } from 'react';

const TYPES = [
  { value: 'participant', label: 'Participant' },
  { value: 'winner', label: 'Winner' },
  { value: 'judge', label: 'Judge' },
  { value: 'sponsor', label: 'Sponsor' },
];

interface Cert {
  id: string;
  recipient_name: string;
  recipient_email: string;
  type: string;
  verification_code: string;
  created_at: string;
}

export default function CertificatesClient({ eventId }: { eventId: string }) {
  const [type, setType] = useState('participant');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [certs, setCerts] = useState<Cert[]>([]);
  const [justCreated, setJustCreated] = useState(0);

  async function load() {
    const res = await fetch(`/api/events/${eventId}/certificates`);
    if (res.ok) {
      const data = await res.json();
      setCerts(data.certificates ?? []);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function generate() {
    setError('');
    setJustCreated(0);
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setError('Enter at least one name.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}/certificates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, lines }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to generate certificates.');
        return;
      }
      setJustCreated(data.count ?? 0);
      setText('');
      await load();
    } catch {
      setError('Network error. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">Generate certificates</h2>
        <p className="mt-1 text-sm text-zinc-500">
          One per line. Use <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">Name,email</code> to
          also store the recipient&apos;s email.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-[200px_1fr]">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Certificate type</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-medium">Recipients</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={'Ayesha Khan,ayesha@example.com\nBilal Ahmed\nSara Malik,sara@example.com'}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </label>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {justCreated > 0 && (
          <p className="mt-2 text-sm text-green-700">
            Generated {justCreated} certificate{justCreated === 1 ? '' : 's'}.
          </p>
        )}
        <button
          onClick={generate}
          disabled={busy}
          className="mt-4 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
        >
          {busy ? 'Generating…' : 'Generate certificates'}
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">Issued certificates ({certs.length})</h2>
        {certs.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">None yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
            {certs.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.recipient_name}</p>
                  <p className="text-xs text-zinc-500">
                    {c.type} · <span className="font-mono">{c.verification_code}</span>
                  </p>
                </div>
                <a
                  href={`/cert/${c.verification_code}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
                >
                  View
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
