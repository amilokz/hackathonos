import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getDb } from '@/lib/db';
import { requireOrganizerFromRequest } from '@/lib/require-organizer';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'openai/gpt-oss-120b';

const FALLBACK_CRITERIA = [
  { name: 'Innovation', weight: 25, description: 'How original and creative the idea is' },
  { name: 'Technical Execution', weight: 25, description: 'Quality of implementation' },
  { name: 'Impact', weight: 25, description: 'Real-world usefulness and potential' },
  { name: 'Presentation', weight: 25, description: 'Clarity of the pitch and demo' },
];

interface AiBreakdownItem {
  criterion: string;
  score_0_10: number;
  reason: string;
}

interface AiResult {
  overall: number;
  breakdown: AiBreakdownItem[];
  strengths: string[];
  weaknesses: string[];
  questions: string[];
}

/** Extract a JSON object from a model response (tolerates ```json fences). */
function extractJson(text: string): AiResult {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? text).trim();
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object in AI response');
  return JSON.parse(candidate.slice(start, end + 1)) as AiResult;
}

/**
 * AI pre-score for a project. Body: { project_id }
 * Uses the event's judging criteria (or generic defaults) and asks Groq for
 * STRICT JSON: { overall 0-100, breakdown[{criterion, score_0_10, reason}],
 * strengths[3], weaknesses[3], questions[3] }. Saved to ai_scores (replaces old).
 */
export async function POST(req: NextRequest) {
  const org = await requireOrganizerFromRequest(req);
  if (!org) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI scoring not configured. Set GROQ_API_KEY in your environment.' },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const projectId = String(body.project_id ?? '');
  if (!projectId) return NextResponse.json({ error: 'project_id is required' }, { status: 400 });

  const db = getDb();
  const project = await db
    .prepare(
      `SELECT p.*, t.name AS team_name, e.id AS event_id, e.name AS event_name
       FROM projects p
       JOIN teams t ON t.id = p.team_id
       JOIN events e ON e.id = t.event_id
       WHERE p.id = ? AND e.organizer_id = ?`
    )
    .get(projectId, org.id) as
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
      }
    | undefined;

  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

  const criteria = await db
    .prepare('SELECT name, weight, description FROM criteria WHERE event_id = ? ORDER BY rowid')
    .all(project.event_id) as { name: string; weight: number; description: string }[];
  const useCriteria = criteria.length > 0 ? criteria : FALLBACK_CRITERIA;

  const criteriaList = useCriteria
    .map((c) => `- ${c.name} (${c.weight}%): ${c.description || 'no description'}`)
    .join('\n');

  const system = `You are an expert hackathon judge. Score the project below STRICTLY as JSON with this exact shape and nothing else:
{
  "overall": <number 0-100>,
  "breakdown": [{"criterion": "<name>", "score_0_10": <number>, "reason": "<one sentence>"}],
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "questions": ["<question 1>", "<question 2>", "<question 3>"]
}
Rules: one breakdown entry per criterion listed; score_0_10 honest and differentiated (avoid all-7s); overall must roughly match the weighted average of breakdown scores scaled to 0-100; be critical but fair; questions should help human judges probe weak spots. Output ONLY the JSON object.`;

  const user = `Event: ${project.event_name}
Team: ${project.team_name}
Project: ${project.title}
Description: ${project.description || '(none)'}
Demo URL: ${project.demo_url || '(none)'}
Repo URL: ${project.repo_url || '(none)'}
Pitch: ${project.pitch_text || '(none)'}

Judging criteria:
${criteriaList}`;

  let ai: AiResult;
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
        temperature: 0.3,
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
    ai = extractJson(content);
  } catch (e) {
    return NextResponse.json(
      { error: `AI scoring failed: ${(e as Error).message}` },
      { status: 502 }
    );
  }

  // Sanity-normalize the result
  const overall = Math.min(100, Math.max(0, Number(ai.overall) || 0));
  const breakdown = (Array.isArray(ai.breakdown) ? ai.breakdown : []).map((b) => ({
    criterion: String(b.criterion ?? ''),
    score_0_10: Math.min(10, Math.max(0, Number(b.score_0_10) || 0)),
    reason: String(b.reason ?? ''),
  }));
  const str = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
  const strengths = str(ai.strengths).slice(0, 5);
  const weaknesses = str(ai.weaknesses).slice(0, 5);
  const questions = str(ai.questions).slice(0, 5);

  const now = new Date().toISOString();
  await db.prepare('DELETE FROM ai_scores WHERE project_id = ?').run(projectId);
  const id = randomUUID();
  await db.prepare(
    'INSERT INTO ai_scores (id, project_id, overall, breakdown_json, strengths, weaknesses, questions, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    projectId,
    overall,
    JSON.stringify(breakdown),
    JSON.stringify(strengths),
    JSON.stringify(weaknesses),
    JSON.stringify(questions),
    now
  );

  return NextResponse.json({
    ai_score: { id, project_id: projectId, overall, breakdown, strengths, weaknesses, questions },
  });
}
