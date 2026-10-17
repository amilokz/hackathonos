'use client';

import { useState } from 'react';
import { Card, Button, Field, inputClass, ErrorNote } from '@/components/ui';

interface TeamOption {
  id: string;
  name: string;
  contact_name: string;
}

export default function SubmitForm({ eventId, eventSlug }: { eventId: string; eventSlug: string }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [teamId, setTeamId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [pitch, setPitch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/teams/lookup?email=${encodeURIComponent(email)}&eventId=${encodeURIComponent(eventId)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Lookup failed');
        return;
      }
      if (data.teams.length === 0) {
        setError('No team found for this email. Register your team first.');
        return;
      }
      setTeams(data.teams);
      setTeamId(data.teams[0].id);
      setStep(2);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          title,
          description,
          demo_url: demoUrl,
          repo_url: repoUrl,
          pitch_text: pitch,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Submission failed');
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
        <p className="text-3xl">🚀</p>
        <h2 className="mt-2 text-xl font-bold text-slate-900">Project submitted!</h2>
        <p className="mt-1 text-sm text-slate-500">The judges will review <strong className="text-slate-700">{title}</strong> soon.</p>
        <a href={`/e/${eventSlug}`} className="mt-6 inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Back to event
        </a>
      </Card>
    );
  }

  if (step === 1) {
    return (
      <Card className="p-6 sm:p-8">
        <h2 className="font-bold text-slate-900">Find your team</h2>
        <p className="mt-1 text-sm text-slate-500">Enter the contact email you registered with.</p>
        <form onSubmit={lookup} className="mt-4 space-y-4">
          <ErrorNote message={error} />
          <Field label="Contact email">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="you@example.com" />
          </Field>
          <Button type="submit" disabled={busy} className="w-full">{busy ? 'Looking up…' : 'Continue'}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-400">
          Haven&apos;t registered yet? <a href={`/e/${eventSlug}/register`} className="font-semibold text-indigo-600 hover:underline">Register your team</a>
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8">
      <form onSubmit={submit} className="space-y-4">
        <ErrorNote message={error} />
        {teams.length > 1 && (
          <Field label="Team">
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className={inputClass}>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Project title">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="MediConnect — clinic queue management" required minLength={2} />
        </Field>
        <Field label="Description" hint="What does it do, who is it for, how does it work?">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputClass} min-h-28`} placeholder="Describe your project…" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Demo URL">
            <input value={demoUrl} onChange={(e) => setDemoUrl(e.target.value)} className={inputClass} placeholder="https://…" />
          </Field>
          <Field label="Repo URL">
            <input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} className={inputClass} placeholder="https://github.com/…" />
          </Field>
        </div>
        <Field label="Pitch" hint="Your 2-minute pitch as text — what you built, why it matters.">
          <textarea value={pitch} onChange={(e) => setPitch(e.target.value)} className={`${inputClass} min-h-28`} placeholder="Paste your pitch here…" />
        </Field>
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Submitting…' : 'Submit project'}</Button>
        <p className="text-xs text-slate-400">Submitting again updates your existing entry.</p>
      </form>
    </Card>
  );
}
