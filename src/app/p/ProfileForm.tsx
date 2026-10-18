'use client';

import { useState } from 'react';
import { Button, Field, inputClass, ErrorNote, SuccessNote } from '@/components/ui';
import type { Participant } from '@/lib/participant-auth';

const SKILL_PRESETS = ['Frontend', 'Backend', 'AI/ML', 'Design', 'Mobile', 'DevOps', 'Marketing', 'Video'];

export default function ProfileForm({ participant }: { participant: Participant }) {
  const [name, setName] = useState(participant.name);
  const [selected, setSelected] = useState<string[]>(
    participant.skills.split(',').map((s) => s.trim()).filter((s) => SKILL_PRESETS.includes(s)),
  );
  const [otherSkills, setOtherSkills] = useState(
    participant.skills
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && !SKILL_PRESETS.includes(s))
      .join(', '),
  );
  const [bio, setBio] = useState(participant.bio);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function toggleSkill(skill: string) {
    setSelected((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(null);
    setBusy(true);
    const skills = [...selected, ...otherSkills.split(',').map((s) => s.trim()).filter(Boolean)];
    try {
      const res = await fetch('/api/participants/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, skills, bio }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Save failed');
        return;
      }
      setSaved('Profile updated.');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <ErrorNote message={error} />
      <SuccessNote message={saved} />
      <Field label="Full name">
        <input
          type="text"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputClass}
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
          placeholder="Other skills, comma-separated"
        />
      </div>
      <Field label="Bio">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className={inputClass}
          rows={3}
          maxLength={2000}
        />
      </Field>
      <p className="text-xs text-slate-400">Signed up {new Date(participant.created_at).toLocaleDateString()} · {participant.email}</p>
      <Button type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Save profile'}
      </Button>
    </form>
  );
}
