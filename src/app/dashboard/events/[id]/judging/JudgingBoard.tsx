'use client';

import { useState } from 'react';

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
      <div className="max-w-3xl mx-auto p-6">
        <p className="text-gray-500">No project submissions yet for this event.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Project list */}
      <div>
        <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-gray-500">
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
                className={`w-full text-left p-3 rounded-lg border ${
                  p.id === selectedId
                    ? 'border-blue-500 bg-blue-50'
                    : 'bg-white hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-sm">{p.title}</div>
                <div className="text-xs text-gray-500">{p.team_name}</div>
                <div className="text-xs mt-1 text-gray-400">
                  {n > 0 ? `${Array.from(new Set((scores[p.id] ?? []).map((s) => s.judge_name))).length} judge(s)` : 'No scores yet'}
                  {hasAi && <span className="ml-2 text-purple-600">🤖 AI scored</span>}
                </div>
              </button>
            );
          })}
        </div>
        <a
          href={`/dashboard/events/${eventId}/criteria`}
          className="block mt-4 text-sm text-blue-600 hover:underline"
        >
          Edit judging criteria →
        </a>
      </div>

      {/* Scoring panel */}
      {project && (
        <div className="space-y-6">
          <div className="bg-white border rounded-lg p-5 shadow-sm">
            <h2 className="text-xl font-bold">{project.title}</h2>
            <p className="text-sm text-gray-500 mb-3">by {project.team_name}</p>
            {project.description && <p className="text-sm mb-3">{project.description}</p>}
            <div className="flex flex-wrap gap-3 text-sm">
              {project.demo_url && (
                <a href={project.demo_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  🔗 Live demo
                </a>
              )}
              {project.repo_url && (
                <a href={project.repo_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  💻 Repository
                </a>
              )}
            </div>
            {project.pitch_text && (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-blue-600">Read pitch</summary>
                <p className="mt-2 whitespace-pre-wrap text-gray-700">{project.pitch_text}</p>
              </details>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* AI pre-score */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-purple-900">🤖 AI pre-score</h3>
              <button
                onClick={runAiScore}
                disabled={aiBusy}
                className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50"
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
                  className="text-sm text-purple-700 hover:underline mb-2"
                >
                  {showAi[project.id] ? 'Hide AI breakdown' : `Show AI breakdown (overall ${ai.overall}/100)`}
                </button>
                {showAi[project.id] && (
                  <div className="space-y-3 text-sm">
                    <div className="text-3xl font-bold text-purple-900">{ai.overall}<span className="text-base text-purple-500">/100</span></div>
                    {ai.breakdown.map((b, i) => (
                      <div key={i} className="bg-white rounded p-3 border border-purple-100">
                        <div className="flex justify-between font-medium">
                          <span>{b.criterion}</span>
                          <span className="text-purple-700">{b.score_0_10}/10</span>
                        </div>
                        <p className="text-gray-600 mt-1">{b.reason}</p>
                      </div>
                    ))}
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="bg-white rounded p-3 border border-purple-100">
                        <div className="font-medium text-green-700 mb-1">Strengths</div>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                          {ai.strengths.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                      <div className="bg-white rounded p-3 border border-purple-100">
                        <div className="font-medium text-red-700 mb-1">Weaknesses</div>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                          {ai.weaknesses.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    </div>
                    <div className="bg-white rounded p-3 border border-purple-100">
                      <div className="font-medium mb-1">Questions to ask the team</div>
                      <ul className="list-disc list-inside text-gray-700 space-y-1">
                        {ai.questions.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Human scoring form */}
          <form onSubmit={submitScores} className="bg-white border rounded-lg p-5 shadow-sm">
            <h3 className="font-semibold mb-4">Your scores</h3>
            <label className="block mb-4">
              <span className="text-sm text-gray-600">Judge name</span>
              <input
                className="mt-1 border rounded px-3 py-2 w-full max-w-xs"
                placeholder="e.g. Kashif Ali"
                value={judgeName}
                onChange={(e) => setJudgeName(e.target.value)}
                required
              />
            </label>
            <div className="space-y-4">
              {criteria.map((c) => (
                <div key={c.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">
                      {c.name} <span className="text-gray-400">({c.weight}%)</span>
                    </span>
                    <span className="font-bold text-blue-700">{form[c.id] ?? 0}/10</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    value={form[c.id] ?? 0}
                    onChange={(e) => setForm({ ...form, [c.id]: Number(e.target.value) })}
                    className="w-full"
                  />
                  {c.description && <p className="text-xs text-gray-400">{c.description}</p>}
                </div>
              ))}
            </div>
            {criteria.length === 0 && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
                No judging criteria defined yet.{' '}
                <a href={`/dashboard/events/${eventId}/criteria`} className="underline">
                  Set them up first
                </a>
                .
              </p>
            )}
            <label className="block mt-4">
              <span className="text-sm text-gray-600">Notes (optional)</span>
              <textarea
                className="mt-1 border rounded px-3 py-2 w-full"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <button
              type="submit"
              disabled={busy || criteria.length === 0}
              className="mt-4 px-5 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Submit scores'}
            </button>
          </form>

          {/* Existing scores */}
          {judges.length > 0 && (
            <div className="bg-white border rounded-lg p-5 shadow-sm">
              <h3 className="font-semibold mb-3">Scores so far</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="pb-2">Judge</th>
                      {criteria.map((c) => (
                        <th key={c.id} className="pb-2">{c.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {judges.map((j) => (
                      <tr key={j} className="border-t">
                        <td className="py-2 font-medium">{j}</td>
                        {criteria.map((c) => {
                          const s = projectScores.find(
                            (x) => x.judge_name === j && x.criteria_id === c.id
                          );
                          return <td key={c.id} className="py-2">{s ? s.score : '—'}</td>;
                        })}
                      </tr>
                    ))}
                    <tr className="border-t font-bold bg-gray-50">
                      <td className="py-2">Average</td>
                      {criteria.map((c) => {
                        const a = avgFor(c.id);
                        return <td key={c.id} className="py-2">{a ?? '—'}</td>;
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
