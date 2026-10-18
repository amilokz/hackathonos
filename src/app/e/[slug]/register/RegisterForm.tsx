'use client';

import { useState } from 'react';
import { Card, Button, Field, inputClass, ErrorNote, LinkButton } from '@/components/ui';

export default function RegisterForm({ eventId, eventSlug }: { eventId: string; eventSlug: string }) {
  const [teamName, setTeamName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [members, setMembers] = useState<string[]>(['']);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  function setMember(i: number, value: string) {
    setMembers((m) => m.map((x, idx) => (idx === i ? value : x)));
  }
  function addMember() {
    if (members.length < 10) setMembers((m) => [...m, '']);
  }
  function removeMember(i: number) {
    setMembers((m) => m.filter((_, idx) => idx !== i));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          name: teamName,
          contact_name: contactName,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          members,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
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
      <Card className="p-8 text-center">
        <p className="text-3xl">🎉</p>
        <h2 className="mt-2 text-xl font-bold text-slate-900">Team registered!</h2>
        <p className="mt-1 text-sm text-slate-500">
          <strong className="text-slate-700">{teamName}</strong> is in. Good luck!
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <LinkButton href={`/e/${eventSlug}/submit`}>
            Submit your project →
          </LinkButton>
          <LinkButton href={`/e/${eventSlug}`} variant="secondary">
            Back to event
          </LinkButton>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8">
      <form onSubmit={onSubmit} className="space-y-4">
        <ErrorNote message={error} />
        <Field label="Team name">
          <input value={teamName} onChange={(e) => setTeamName(e.target.value)} className={inputClass} placeholder="Code Warriors" required minLength={2} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact person">
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputClass} placeholder="Ali Khan" />
          </Field>
          <Field label="Contact phone">
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputClass} placeholder="03xx xxxxxxx" />
          </Field>
        </div>
        <Field label="Contact email" hint="Used to look up your team when submitting the project.">
          <input type="email" required value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputClass} placeholder="you@example.com" />
        </Field>
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Team members <span className="font-normal text-slate-400">({members.length}/10)</span>
          </span>
          <div className="space-y-2">
            {members.map((m, i) => (
              <div key={i} className="flex gap-2">
                <input value={m} onChange={(e) => setMember(i, e.target.value)} className={inputClass} placeholder={`Member ${i + 1} name`} />
                {members.length > 1 && (
                  <button type="button" onClick={() => removeMember(i)} className="rounded-xl border border-slate-300 px-3 text-slate-500 hover:bg-slate-50" aria-label="Remove member">✕</button>
                )}
              </div>
            ))}
          </div>
          {members.length < 10 ? (
            <button type="button" onClick={addMember} className="mt-2 text-sm font-semibold text-indigo-600 hover:underline">+ Add member</button>
          ) : (
            <p className="mt-2 text-xs text-slate-400">Maximum 10 members per team.</p>
          )}
        </div>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Registering…' : 'Register team'}
        </Button>
      </form>
    </Card>
  );
}
