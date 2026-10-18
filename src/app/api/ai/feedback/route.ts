import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest } from '@/lib/require-organizer';
import { requireJudgeFromRequest } from '@/lib/judge-auth';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';

const DISCLAIMER =
  'AI-generated suggestion — final decision rests with human judges.';

interface CriterionSuggestion {
  criterion: string;
  suggestion: string;
}

interface AiFeedback {
  strengths: string[];
  improvements: string[];
  criterion_suggestions: CriterionSuggestion[];
  overall: string;
}

/** Extract a JSON object from a model response (tolerates ```json fences). */
function extractJson(text: string): AiFeedback {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? text).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object in AI response');
  return JSON.parse(candidate.slice(start, end + 1)) as AiFeedback;
}

function sanitize(ai: AiFeedback): AiFeedback {
  const str = (v: unknown): string[] =>
    (Array.isArray(v) ? v : []).map((s) => String(s ?? '').trim()).filter(Boolean);
  const criterion_suggestions: CriterionSuggestion[] = (
    Array.isArray(ai.criterion_suggestions) ? ai.criterion_suggestions : []
  )
    .map((c) => ({
      criterion: String(c?.criterion ?? '').trim(),
      suggestion: String(c?.suggestion ?? '').trim(),
    }))
    .filter((c) => c.criterion || c.suggestion);
  return {
    strengths: str(ai.strengths).slice(0, 3),
    improvements: str(ai.improvements).slice(0, 3),
    criterion_suggestions,
    overall: String(ai.overall ?? '').trim(),
  };
}

/**
 * AI project feedback assistant. Body: { project_id, regenerate? }
 * - Organizer (own events) or judge (own event) only.
 * - 400 "AI not configured" when GROQ_API_KEY is missing.
 * - Returns the cached ai_feedback row unless regenerate: true.
 * - Otherwise calls Groq for STRICT JSON feedback, caches it, and returns it.
 */
export async function POST(req: NextRequest) {
  await migrate();

  const org = await requireOrganizerFromRequest(req);
  const judge = org ? null : await requireJudgeFromRequest(req);
  if (!org && !judge) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const projectId = String(body.project_id ?? '');
  const regenerate = body.regenerate === true;
  if (!projectId) return NextResponse.json({ error: 'project_id is required' }, { status: 400 });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 400 });
  }

  const db = getDb();

  const project = (await db
    .prepare(
      `SELECT p.id, p.title, p.description, p.demo_url, p.repo_url, p.pitch_text,
              t.name AS team_name, e.id AS event_id, e.name AS event_name, e.organizer_id
       FROM projects p
       JOIN teams t ON t.id = p.team_id
       JOIN events e ON e.id = t.event_id
       WHERE p.id = ?`
    )
    .get(projectId)) as
    | {
        id: string;
        title: string;
        description: string;
        demo_url: string;
        repo_url: string;
        pitch_text: string;
        team_name: string;
        event_id: string;
        event_name: string;
        organizer_id: string;
      }
    | undefined;

  if (
    !project ||
    (org && project.organizer_id !== org.id) ||
    (judge && project.event_id !== judge.event_id)
  ) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Serve the cached feedback unless a fresh generation was requested.
  if (!regenerate) {
    const cached = (await db
      .prepare('SELECT feedback_json FROM ai_feedback WHERE project_id = ?')
      .get(projectId)) as { feedback_json: string } | undefined;
    if (cached) {
      try {
        const feedback = JSON.parse(cached.feedback_json) as AiFeedback;
        return NextResponse.json({ feedback, disclaimer: DISCLAIMER, cached: true });
      } catch {
        // Corrupt row: fall through and regenerate.
      }
    }
  }

  const criteria = (await db
    .prepare('SELECT name, weight, description FROM criteria WHERE event_id = ? ORDER BY rowid')
    .all(project.event_id)) as { name: string; weight: number; description: string }[];

  const criteriaList =
    criteria.length > 0
      ? criteria
          .map((c) => `- ${c.name} (${c.weight}%): ${c.description || 'no description'}`)
          .join('\n')
      : '(no judging criteria defined for this event)';

  const system = `You are a constructive hackathon mentor helping teams improve. Read the project below and respond with STRICT JSON — this exact shape and nothing else:
{
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement 1>", "<improvement 2>", "<improvement 3>"],
  "criterion_suggestions": [{"criterion": "<criterion name>", "suggestion": "<one concrete tip to score better on it>"}],
  "overall": "<2-3 sentence overall assessment>"
}
Rules:
- Ground EVERYTHING in the actual project content provided (title, description, demo, repo, pitch). Do NOT invent features, users, metrics, team size, or outcomes that are not stated.
- Do NOT hallucinate technologies or integrations that are not mentioned. If a section is missing (e.g. no repo URL), say so instead of guessing what it contains.
- One criterion_suggestions entry per judging criterion listed; if no criteria are listed, return an empty array.
- Suggestions must be specific and actionable, tied to the project described — no generic filler.
- Output ONLY the JSON object.`;

  const user = `Event: ${project.event_name}
Team: ${project.team_name}
Project: ${project.title}
Description: ${project.description || '(none)'}
Demo URL: ${project.demo_url || '(none)'}
Repo URL: ${project.repo_url || '(none)'}
Pitch: ${project.pitch_text || '(none)'}

Judging criteria:
${criteriaList}`;

  let feedback: AiFeedback;
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.4,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Groq API error (${res.status}): ${text.slice(0, 300)}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    feedback = sanitize(extractJson(content));
  } catch (e) {
    return NextResponse.json(
      { error: `AI feedback failed: ${(e as Error).message}` },
      { status: 502 }
    );
  }

  const now = new Date().toISOString();
  await db.prepare('DELETE FROM ai_feedback WHERE project_id = ?').run(projectId);
  await db
    .prepare('INSERT INTO ai_feedback (id, project_id, feedback_json, created_at) VALUES (?, ?, ?, ?)')
    .run(randomUUID(), projectId, JSON.stringify(feedback), now);

  return NextResponse.json({ feedback, disclaimer: DISCLAIMER, cached: false });
}
