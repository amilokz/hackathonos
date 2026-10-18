'use client';

import { useState } from 'react';
import { Card, Button, Field, inputClass, ErrorNote } from '@/components/ui';
import AIFeedbackButton from '@/components/AIFeedbackButton';
import { DsIcon } from '@/components/design-system';

interface Criterion {
  id: string;
  name: string;
  weight: number;
  description: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  demo_url: string;
  repo_url: string;
  pitch_text: string;
  team_name: string;
}

interface ScoreRow {
  judge_name: string;
  criteria_id: string;
  score: number;
  notes: string;
}

interface AiScore {
  overall: number;
  breakdown: { criterion: string; score_0_10: number; reason: string }[];
  strengths: string[];
  weaknesses: string[];
  questions: string[];
}

export default function JudgingBoard({
  eventId,
  criteria,
  projects,
  initialScores,
  initialAi,
}: {
  eventId: string;
  criteria: Criterion[];
  projects: Project[];
  initialScores: Record<string, ScoreRow[]>;
  initialAi: Record<string, AiScore>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(projects[0]?.id ?? null);
  const [scores, setScores] = useState(initialScores);
  const [aiScores, setAiScores] = useState(initialAi);
  const [judgeName, setJudgeName] = useState('');
  const [form, setForm] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [error, setError] = useState('');
  const [showAi, setShowAi] = useState<Record<string, boolean>>({});

  const project = projects.find((p) => p.id === selectedId) ?? null;
  const projectScores = selectedId ? scores[selectedId] ?? [] : [];
  const judges = Array.from(new Set(projectScores.map((s) => s.judge_name)));
  const ai = selectedId ? aiScores[selectedId] : undefined;

  function avgFor(cid: string): number | null {
    const vals = projectScores.filter((s) => s.criteria_id === cid).map((s) => s.score);
    if (!vals.length) return null;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  }

  async function submitScores(e: React.FormEvent) {
    e.preventDefault();
    if (!project || !judgeName.trim()) {
      setError('Enter your name as judge first.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const payload = criteria.map((c) => ({
        project_id: project.id,
        judge_name: judgeName.trim(),
        criteria_id: c.id,
        score: form[c.id] ?? 0,
        notes,
      }));
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save scores');
      // Refresh local scores for this project
      const mine: ScoreRow[] = payload.map((p) => ({
        judge_name: p.judge_name,
        criteria_id: p.criteria_id,
        score: p.score,
        notes: p.notes,
      }));
      const others = (scores[project.id] ?? []).filter(
        (s) => s.judge_name !== judgeName.trim()
      );
      setScores({ ...scores, [project.id]: [...others, ...mine] });
      setNotes('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function runAiScore() {
    if (!project) return;
    setError('');
    setAiBusy(true);
    try {
      const res = await fetch('/api/ai/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI scoring failed');
      setAiScores({ ...aiScores, [project.id]: data.ai_score });
      setShowAi({ ...showAi, [project.id]: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAiBusy(false);
    }
  }

  if (projects.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-lg font-semibold text-slate-900">No project submissions yet</p>
        <p className="mt-1 text-sm text-slate-500">Projects will appear here once teams submit.</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Project list */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-400">
          Projects ({projects.length})
        </h2>
        <div className="space-y-2">
          {projects.map((p) => {
            const n = (scores[p.id] ?? []).length;
            const hasAi = !!aiScores[p.id];
            return (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedId(p.id);
                  setForm({});
                  setError('');
                }}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  p.id === selectedId
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="text-sm font-semibold text-slate-900">{p.title}</div>
                <div className="text-xs text-slate-500">{p.team_name}</div>
                <div className="mt-1 text-xs text-slate-400">
                  {n > 0 ? `${Array.from(new Set((scores[p.id] ?? []).map((s) => s.judge_name))).length} judge(s)` : 'No scores yet'}
                  {hasAi && <span className="ml-2 inline-flex items-center gap-1 text-purple-600"><DsIcon name="bot" className="h-3.5 w-3.5" /> AI scored</span>}
                </div>
              </button>
            );
          })}
        </div>
        <a
          href={`/dashboard/events/${eventId}/criteria`}
          className="mt-4 block text-sm font-semibold text-indigo-600 hover:underline"
        >
          Edit judging criteria →
        </a>
      </div>

      {/* Scoring panel */}
      {project && (
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">{project.title}</h2>
            <p className="mb-3 text-sm text-slate-500">by {project.team_name}</p>
            {project.description && <p className="mb-3 text-sm text-slate-600">{project.description}</p>}
            <div className="flex flex-wrap gap-3 text-sm">
              {project.demo_url && (
                <a href={project.demo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline">
                  <DsIcon name="link" className="h-3.5 w-3.5" /> Live demo
                </a>
              )}
              {project.repo_url && (
                <a href={project.repo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline">
                  <DsIcon name="laptop" className="h-3.5 w-3.5" /> Repository
                </a>
              )}
            </div>
            {project.pitch_text && (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer font-medium text-indigo-600">Read pitch</summary>
                <p className="mt-2 whitespace-pre-wrap text-slate-600">{project.pitch_text}</p>
              </details>
            )}
          </Card>

          <ErrorNote message={error || null} />

          {/* AI pre-score */}
          <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-bold text-purple-900"><DsIcon name="bot" className="h-5 w-5" /> AI pre-score</h3>
              <button
                onClick={runAiScore}
                disabled={aiBusy}
                className="rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
              >
                {aiBusy ? 'Scoring…' : ai ? 'Re-run AI score' : 'AI Score this project'}
              </button>
            </div>
            {!ai && !aiBusy && (
              <p className="text-sm text-purple-700">
                Let AI read the submission and suggest scores, strengths, weaknesses and questions for judges.
              </p>
            )}
            {ai && (
              <div>
                <button
                  onClick={() => setShowAi({ ...showAi, [project.id]: !showAi[project.id] })}
                  className="mb-2 text-sm font-medium text-purple-700 hover:underline"
                >
                  {showAi[project.id] ? 'Hide AI breakdown' : `Show AI breakdown (overall ${ai.overall}/100)`}
                </button>
                {showAi[project.id] && (
                  <div className="space-y-3 text-sm">
                    <div className="text-3xl font-extrabold tracking-tight text-purple-900">{ai.overall}<span className="text-base font-medium text-purple-500">/100</span></div>
                    {ai.breakdown.map((b, i) => (
                      <div key={i} className="rounded-xl border border-purple-100 bg-white p-3">
                        <div className="flex justify-between font-semibold text-slate-900">
                          <span>{b.criterion}</span>
                          <span className="text-purple-700">{b.score_0_10}/10</span>
                        </div>
                        <p className="mt-1 text-slate-600">{b.reason}</p>
                      </div>
                    ))}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-purple-100 bg-white p-3">
                        <div className="mb-1 font-semibold text-emerald-700">Strengths</div>
                        <ul className="list-inside list-disc space-y-1 text-slate-700">
                          {ai.strengths.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                      <div className="rounded-xl border border-purple-100 bg-white p-3">
                        <div className="mb-1 font-semibold text-red-700">Weaknesses</div>
                        <ul className="list-inside list-disc space-y-1 text-slate-700">
                          {ai.weaknesses.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    </div>
                    <div className="rounded-xl border border-purple-100 bg-white p-3">
                      <div className="mb-1 font-semibold text-slate-900">Questions to ask the team</div>
                      <ul className="list-inside list-disc space-y-1 text-slate-700">
                        {ai.questions.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI project feedback assistant (cached server-side) */}
          <AIFeedbackButton key={project.id} projectId={project.id} />

          {/* Human scoring form */}
          <Card className="p-5 sm:p-6">
            <form onSubmit={submitScores} className="space-y-4">
              <h3 className="font-bold text-slate-900">Your scores</h3>
              <Field label="Judge name">
                <input
                  className={inputClass}
                  placeholder="e.g. Kashif Ali"
                  value={judgeName}
                  onChange={(e) => setJudgeName(e.target.value)}
                  required
                />
              </Field>
              <div className="space-y-4">
                {criteria.map((c) => (
                  <div key={c.id}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-semibold text-slate-900">
                        {c.name} <span className="font-normal text-slate-400">({c.weight}%)</span>
                      </span>
                      <span className="font-bold text-indigo-600">{form[c.id] ?? 0}/10</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={0.5}
                      value={form[c.id] ?? 0}
                      onChange={(e) => setForm({ ...form, [c.id]: Number(e.target.value) })}
                      className="w-full accent-indigo-600"
                    />
                    {c.description && <p className="text-xs text-slate-400">{c.description}</p>}
                  </div>
                ))}
              </div>
              {criteria.length === 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  No judging criteria defined yet.{' '}
                  <a href={`/dashboard/events/${eventId}/criteria`} className="font-semibold underline">
                    Set them up first
                  </a>
                  .
                </div>
              )}
              <Field label="Notes (optional)">
                <textarea
                  className={inputClass}
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
              <Button
                type="submit"
                disabled={busy || criteria.length === 0}
              >
                {busy ? 'Saving…' : 'Submit scores'}
              </Button>
            </form>
          </Card>

          {/* Existing scores */}
          {judges.length > 0 && (
            <Card className="p-5">
              <h3 className="mb-3 font-bold text-slate-900">Scores so far</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="pb-2 pr-3 font-semibold">Judge</th>
                      {criteria.map((c) => (
                        <th key={c.id} className="pb-2 pr-3 font-semibold">{c.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {judges.map((j) => (
                      <tr key={j} className="border-t border-slate-100">
                        <td className="py-2 pr-3 font-semibold text-slate-900">{j}</td>
                        {criteria.map((c) => {
                          const s = projectScores.find(
                            (x) => x.judge_name === j && x.criteria_id === c.id
                          );
                          return <td key={c.id} className="py-2 pr-3 text-slate-600">{s ? s.score : '—'}</td>;
                        })}
                      </tr>
                    ))}
                    <tr className="border-t border-slate-100 bg-slate-50 font-bold">
                      <td className="py-2 pr-3 text-slate-900">Average</td>
                      {criteria.map((c) => {
                        const a = avgFor(c.id);
                        return <td key={c.id} className="py-2 pr-3 text-slate-900">{a ?? '—'}</td>;
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
