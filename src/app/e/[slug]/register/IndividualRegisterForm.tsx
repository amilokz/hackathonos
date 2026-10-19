'use client';

import { useState } from 'react';
import { Card, Button, Field, inputClass, ErrorNote, SuccessNote } from '@/components/ui';
import { DsIcon } from '@/components/design-system';

export default function IndividualRegisterForm({
  eventId,
  eventName,
}: {
  eventId: string;
  eventName: string;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${eventId}/register-individual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not complete registration');
        return;
      }
      setDone(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Card className="p-8 text-center sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          <DsIcon name="check" className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-xl font-bold text-slate-900">You&apos;re registered!</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
          We&apos;ve emailed your confirmation for {eventName}. Check your inbox for the meeting
          link and WhatsApp group — and watch for a reminder before it starts.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8">
      <form onSubmit={onSubmit} className="space-y-4">
        <ErrorNote message={error} />
        <SuccessNote message={null} />
        <Field label="Full name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Your full name"
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </Field>
        <Field label="Phone (optional)" hint="So the organizer can reach you about schedule changes.">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            placeholder="+92 300 1234567"
            autoComplete="tel"
          />
        </Field>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Registering…' : 'Register'}
        </Button>
        <p className="text-center text-xs text-slate-400">
          No account needed — just your name and email.
        </p>
      </form>
    </Card>
  );
}
