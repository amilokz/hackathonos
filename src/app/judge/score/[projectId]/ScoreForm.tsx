'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Card, Button, Field, inputClass, ErrorNote, SuccessNote, Breadcrumb } from '@/components/ui';
import AIFeedbackButton from '@/components/AIFeedbackButton';
import type { CriterionInfo, ExistingScore } from './page';

interface ProjectInfo {
  id: string;
  title: string;
  description: string;
  demo_url: string;
  repo_url: string;
  pitch_text: string;
  team_name: string;
}

export default function ScoreForm({
  project,
  eventName,
  criteria,
  initialScores,
  initialOverallNotes,
  judgeName,
}: {
  project: ProjectInfo;
  eventName: string;
  criteria: CriterionInfo[];
  initialScores: Record<string, ExistingScore>;
  initialOverallNotes: string;
  judgeName: string;
}) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, string>>(() =>
    Object.fromEntries(criteria.map((c) => [c.id, initialScores[c.id]?.score ?? ''])),
  );
  const [notes, setNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(criteria.map((c) => [c.id, initialScores[c.id]?.notes ?? ''])),
  );
  const [overallNotes, setOverallNotes] = useState(initialOverallNotes);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const totalWeight = useMemo(() => criteria.reduce((n, c) => n + c.weight, 0), [criteria]);

  // Live weighted total on the same 0-100 scale as the organizer leaderboard:
  // Σ(score 0-10 × weight/totalWeight) × 10.
  const weightedTotal = useMemo(() => {
    if (totalWeight <= 0) return null;
    let sum = 0;
    let scoredAny = false;
    for (const c of criteria) {
      const raw = scores[c.id];
      const v = raw === '' ? null : Number(raw);
      if (v !== null && Number.isFinite(v)) {
        sum += v * (c.weight / totalWeight);
        scoredAny = true;
      }
    }
    if (!scoredAny) return null;
    return Math.round(sum * 10 * 100) / 100;
  }, [scores, criteria, totalWeight]);

  const scoredCount = criteria.filter((c) => {
    const v = scores[c.id];
    return v !== '' && Number.isFinite(Number(v));
  }).length;

  function setScore(id: string, value: string) {
    setSaved(false);
    setScores((s) => ({ ...s, [id]: value }));
  }

  async function onSave() {
    setError(null);
    setSaved(false);

    const payload: { criteria_id: string; score: number; notes: string }[] = [];
    for (const c of criteria) {
      const raw = scores[c.id];
      if (raw === '') {
        setError(`Please enter a score for “${c.name}” (or leave the project unscored).`);
        return;
      }
      const v = Number(raw);
      if (!Number.isFinite(v) || v < 0 || v > 10) {
        setError(`Score for “${c.name}” must be between 0 and 10.`);
        return;
      }
      payload.push({ criteria_id: c.id, score: v, notes: notes[c.id] ?? '' });
    }

    setBusy(true);
    try {
      const res = await fetch('/api/judge/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          overall_notes: overallNotes,
          scores: payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not save scores. Please try again.');
        return;
      }
      setSaved(true);
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
              Judge portal
            </span>
          </p>
          <p className="text-sm text-slate-500">
            Signed in as <span className="font-semibold text-slate-700">{judgeName}</span>
          </p>
        </Container>
      </header>

      <Container className="py-8">
        <Breadcrumb
          items={[
            { label: eventName, href: '/judge' },
            { label: 'Projects', href: '/judge' },
            { label: project.title },
          ]}
        />

        <Card className="mb-6 p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600">{project.team_name}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{project.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{project.description}</p>
          {project.pitch_text && (
            <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              {project.pitch_text}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-sm font-medium">
            {project.demo_url && (
              <a href={project.demo_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                Live demo ↗
              </a>
            )}
            {project.repo_url && (
              <a href={project.repo_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                Repository ↗
              </a>
            )}
          </div>
        </Card>

        <div className="mb-6">
          <AIFeedbackButton projectId={project.id} />
        </div>

        {criteria.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="font-semibold text-slate-700">No judging criteria yet</p>
            <p className="mt-1 text-sm text-slate-500">
              The organizer hasn&apos;t set up criteria for this event. Check back later.
            </p>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <ErrorNote message={error} />
              <SuccessNote message={saved ? 'Scores saved ✓' : null} />

              {criteria.map((c) => (
                <Card key={c.id} className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-bold text-slate-900">{c.name}</h2>
                      {c.description && <p className="mt-0.5 text-sm text-slate-500">{c.description}</p>}
                    </div>
                    <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                      Weight {c.weight}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr]">
                    <Field label="Score (0–10)">
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={0.5}
                        inputMode="decimal"
                        value={scores[c.id] ?? ''}
                        onChange={(e) => setScore(c.id, e.target.value)}
                        className={inputClass}
                        placeholder="e.g. 8.5"
                      />
                    </Field>
                    <Field label="Feedback (optional)">
                      <textarea
                        rows={2}
                        value={notes[c.id] ?? ''}
                        onChange={(e) => {
                          setSaved(false);
                          setNotes((n) => ({ ...n, [c.id]: e.target.value }));
                        }}
                        className={inputClass}
                        placeholder="What worked, what could improve…"
                      />
                    </Field>
                  </div>
                </Card>
              ))}

              <Card className="p-5">
                <Field label="Overall comments (optional)">
                  <textarea
                    rows={4}
                    value={overallNotes}
                    onChange={(e) => {
                      setSaved(false);
                      setOverallNotes(e.target.value);
                    }}
                    className={inputClass}
                    placeholder="General impressions of the project…"
                  />
                </Field>
              </Card>

              <Button onClick={onSave} disabled={busy} className="w-full sm:w-auto">
                {busy ? 'Saving…' : `Save scores (${scoredCount}/${criteria.length})`}
              </Button>
            </div>

            <div className="lg:sticky lg:top-6 lg:self-start">
              <Card className="p-6 text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Weighted total</p>
                <p className="mt-2 text-5xl font-extrabold tracking-tight text-slate-900">
                  {weightedTotal === null ? '—' : weightedTotal}
                </p>
                <p className="mt-1 text-sm text-slate-500">/ 100</p>
                <p className="mt-4 text-xs text-slate-400">
                  Σ(score × weight) × 10 — same formula as the organizer leaderboard.
                </p>
                <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-4 text-left">
                  {criteria.map((c) => {
                    const raw = scores[c.id];
                    const v = raw === '' ? null : Number(raw);
                    return (
                      <div key={c.id} className="flex justify-between text-xs text-slate-500">
                        <span>{c.name}</span>
                        <span className="font-semibold text-slate-700">
                          {v !== null && Number.isFinite(v) ? v : '—'} × {c.weight}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}
