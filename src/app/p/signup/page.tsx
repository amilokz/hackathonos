'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Card, Button, Field, inputClass, ErrorNote } from '@/components/ui';

const SKILL_PRESETS = ['Frontend', 'Backend', 'AI/ML', 'Design', 'Mobile', 'DevOps', 'Marketing', 'Video'];

export default function ParticipantSignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [otherSkills, setOtherSkills] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggleSkill(skill: string) {
    setSelected((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const skills = [...selected, ...otherSkills.split(',').map((s) => s.trim()).filter(Boolean)];
    try {
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, skills, bio }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Sign up failed');
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
      <Container className="flex items-center justify-center py-12">
        <Card className="w-full max-w-xl p-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create your participant profile</h1>
          <p className="mt-1 text-sm text-slate-500">
            One profile for every hackathon — teams, passes and certificates in one place.
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-5">
            <ErrorNote message={error} />
            <Field label="Full name">
              <input
                type="text"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="Ada Lovelace"
                autoComplete="name"
              />
            </Field>
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
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Skills</p>
              <div className="flex flex-wrap gap-2">
                {SKILL_PRESETS.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    aria-pressed={selected.includes(skill)}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                      selected.includes(skill)
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={otherSkills}
                onChange={(e) => setOtherSkills(e.target.value)}
                className={`${inputClass} mt-3`}
                placeholder="Other skills, comma-separated (e.g. Solidity, 3D modelling)"
              />
            </div>
            <Field label="Short bio (optional)">
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className={inputClass}
                rows={3}
                maxLength={2000}
                placeholder="What do you love building? What are you looking for in a team?"
              />
            </Field>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? 'Creating profile…' : 'Create profile'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            Already have a profile?{' '}
            <a href="/p/login" className="font-semibold text-indigo-600 hover:underline">
              Log in
            </a>
          </p>
        </Card>
      </Container>
    </div>
  );
}
