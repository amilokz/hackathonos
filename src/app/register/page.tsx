'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Card, Button, Field, inputClass, ErrorNote } from '@/components/ui';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, invite_code: inviteCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
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
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create organizer account</h1>
        <p className="mt-1 text-sm text-slate-500">Run hackathons end to end — free.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <ErrorNote message={error} />
          <Field label="Your name / organization">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="TechKhwa" required minLength={2} autoComplete="organization" />
          </Field>
          <Field label="Email">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="you@company.com" autoComplete="email" />
          </Field>
          <Field label="Password" hint="Minimum 8 characters.">
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" autoComplete="new-password" />
          </Field>
          <Field label="Invite code" hint="Organizer accounts are invite-only. Ask your administrator for a code.">
            <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} className={inputClass} placeholder="ORG-XXXXXXXX" autoComplete="off" />
          </Field>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <a href="/login" className="font-semibold text-indigo-600 hover:underline">Sign in</a>
        </p>
      </Card>
    </Container>
  );
}
