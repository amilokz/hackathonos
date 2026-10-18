'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Card, Button, Field, inputClass, ErrorNote } from '@/components/ui';

export default function JudgeLoginPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/judge/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      router.push('/judge');
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container className="flex min-h-[80vh] items-center justify-center py-12">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Judge login</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter the access code your event organizer shared with you.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <ErrorNote message={error} />
          <Field label="Access code">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className={`${inputClass} uppercase tracking-widest`}
              placeholder="JUDGE-XXXXX"
              autoComplete="off"
              autoFocus
            />
          </Field>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Signing in…' : 'Enter judging portal'}
          </Button>
        </form>
      </Card>
    </Container>
  );
}
