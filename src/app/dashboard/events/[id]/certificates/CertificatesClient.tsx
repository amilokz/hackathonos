'use client';

import { useEffect, useState } from 'react';
import { Card, Button, Field, inputClass, ErrorNote, SuccessNote } from '@/components/ui';

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
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900">Generate certificates</h2>
        <p className="mt-1 text-sm text-slate-500">
          One per line. Use <code className="rounded bg-slate-100 px-1 text-slate-600">Name,email</code> to
          also store the recipient&apos;s email.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-[220px_1fr]">
          <Field label="Certificate type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={inputClass}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Recipients">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              placeholder={'Ayesha Khan,ayesha@example.com\nBilal Ahmed\nSara Malik,sara@example.com'}
              className={`${inputClass} font-mono`}
            />
          </Field>
        </div>
        <ErrorNote message={error || null} />
        <SuccessNote
          message={justCreated > 0 ? `Generated ${justCreated} certificate${justCreated === 1 ? '' : 's'}.` : null}
        />
        <div className="mt-4">
          <Button onClick={generate} disabled={busy}>
            {busy ? 'Generating…' : 'Generate certificates'}
          </Button>
        </div>
      </Card>

      <Card className="p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900">Issued certificates ({certs.length})</h2>
        {certs.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">None yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {certs.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{c.recipient_name}</p>
                  <p className="text-xs capitalize text-slate-500">
                    {c.type} · <span className="font-mono">{c.verification_code}</span>
                  </p>
                </div>
                <a
                  href={`/cert/${c.verification_code}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  View
                </a>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
