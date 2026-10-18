'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Card, Button, Field, inputClass, ErrorNote } from '@/components/ui';

export default function ParticipantLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/participants/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      router.push(data.redirect || '/p');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <Container className="flex h-16 items-center justify-between">
          <p className="text-lg font-extrabold tracking-tight text-slate-900">
            Hackathon<span className="text-indigo-600">OS</span>
            <span className="ml-2 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700">
              Participant portal
            </span>
          </p>
        </Container>
      </header>
      <Container className="flex min-h-[70vh] items-center justify-center py-12">
        <Card className="w-full max-w-md p-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Participant login</h1>
          <p className="mt-1 text-sm text-slate-500">Enter the email you signed up with.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <ErrorNote message={error} />
            <Field label="Email">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </Field>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Logging in…' : 'Log in'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            No profile yet?{' '}
            <a href="/p/signup" className="font-semibold text-indigo-600 hover:underline">
              Sign up
            </a>
          </p>
        </Card>
      </Container>
    </div>
  );
}
