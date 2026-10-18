'use client';

import { useState } from 'react';
import { Card, Button, ErrorNote } from '@/components/ui';

export interface AiFeedback {
  strengths: string[];
  improvements: string[];
  criterion_suggestions: { criterion: string; suggestion: string }[];
  overall: string;
}

const DISCLAIMER = 'AI-generated suggestion — final decision rests with human judges.';

/**
 * "🤖 Get AI Feedback" button for a project. POSTs to /api/ai/feedback,
 * shows a loading state, then renders the feedback card (cached results are
 * served server-side unless regenerated). "Regenerate" forces fresh AI
 * output. When the backend reports AI is not configured, a muted notice
 * replaces the button action.
 */
export default function AIFeedbackButton({ projectId }: { projectId: string }) {
  const [feedback, setFeedback] = useState<AiFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(regenerate: boolean) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, ...(regenerate ? { regenerate: true } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 400 && String(data.error ?? '').includes('AI not configured')) {
          setNotConfigured(true);
        } else {
          setError(data.error || 'Could not load AI feedback. Please try again.');
        }
        return;
      }
      setFeedback(data.feedback as AiFeedback);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // AI isn't set up on this deployment — show a muted notice instead of a dead button.
  if (notConfigured) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        🤖 AI feedback isn&apos;t configured on this deployment.
      </p>
    );
  }

  return (
    <div>
      <ErrorNote message={error} />
      {!feedback && (
        <Button onClick={() => load(false)} disabled={loading}>
          {loading ? '🤖 Analyzing project…' : '🤖 Get AI Feedback'}
        </Button>
      )}

      {feedback && (
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-bold tracking-tight text-slate-900">🤖 AI Project Feedback</h3>
            <button
              onClick={() => load(true)}
              disabled={loading}
              className="text-sm font-semibold text-indigo-600 hover:underline disabled:opacity-50"
            >
              {loading ? 'Regenerating…' : '↻ Regenerate'}
            </button>
          </div>

          {loading && (
            <p className="mt-4 text-sm text-slate-500">🤖 Analyzing project…</p>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="mb-2 text-sm font-bold text-emerald-800">Strengths</div>
              <ul className="list-inside list-disc space-y-1.5 text-sm text-slate-700">
                {feedback.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="mb-2 text-sm font-bold text-amber-800">Improvements</div>
              <ul className="list-inside list-disc space-y-1.5 text-sm text-slate-700">
                {feedback.improvements.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>

          {feedback.criterion_suggestions.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-sm font-bold text-slate-900">Per-criterion suggestions</div>
              <div className="space-y-2">
                {feedback.criterion_suggestions.map((c, i) => (
                  <div key={i} className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-sm">
                    <span className="font-bold text-indigo-700">{c.criterion}:</span>{' '}
                    <span className="text-slate-700">{c.suggestion}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {feedback.overall && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-1 text-sm font-bold text-slate-900">Overall</div>
              <p className="text-sm text-slate-700">{feedback.overall}</p>
            </div>
          )}

          <p className="mt-4 border-t border-slate-100 pt-3 text-xs italic text-slate-400">
            {DISCLAIMER}
          </p>
        </Card>
      )}
    </div>
  );
}
