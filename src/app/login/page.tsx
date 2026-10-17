'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Card, Button, Field, inputClass, ErrorNote } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }
      router.push('/dashboard');
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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Organizer login</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in to manage your hackathons.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <ErrorNote message={error} />
          <Field label="Email">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="you@company.com" autoComplete="email" />
          </Field>
          <Field label="Password">
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" autoComplete="current-password" />
          </Field>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          No account yet?{' '}
          <a href="/register" className="font-semibold text-indigo-600 hover:underline">Create one</a>
        </p>
      </Card>
    </Container>
  );
}
