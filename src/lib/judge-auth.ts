import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { getDb } from './db';

const JUDGE_SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET env var is not set');
  }
  return secret;
}

interface JudgeSessionPayload {
  sub: string; // judge id
  event_id: string; // event id the judge belongs to
  iat: number;
  exp: number;
}

function sign(data: string): string {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('hex');
}

/** Creates a signed session token for a judge. */
export function createJudgeSession(judgeId: string, eventId: string): string {
  const payload: JudgeSessionPayload = {
    sub: judgeId,
    event_id: eventId,
    iat: Date.now(),
    exp: Date.now() + JUDGE_SESSION_MAX_AGE_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

/**
 * Verifies a judge session token.
 * Returns { judgeId, eventId }, or null when malformed, tampered, or expired.
 */
export function verifyJudgeSession(token: string): { judgeId: string; eventId: string } | null {
  try {
    const [body, signature] = token.split('.');
    if (!body || !signature) return null;
    const expected = sign(body);
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as JudgeSessionPayload;
    if (!payload.sub || !payload.event_id || typeof payload.exp !== 'number') return null;
    if (Date.now() > payload.exp) return null;
    return { judgeId: payload.sub, eventId: payload.event_id };
  } catch {
    return null;
  }
}

export const JUDGE_SESSION_COOKIE_NAME = 'hackathonos_judge';
export const JUDGE_SESSION_COOKIE_MAX_AGE = JUDGE_SESSION_MAX_AGE_MS / 1000;

export interface Judge {
  id: string;
  event_id: string;
  name: string;
  email: string;
  access_code: string;
  created_at: string;
}

/** Loads the judge row for a verified token, or null. */
export async function getJudgeFromToken(token: string): Promise<Judge | null> {
  const verified = verifyJudgeSession(token);
  if (!verified) return null;
  const row = (await getDb()
    .prepare('SELECT id, event_id, name, email, access_code, created_at FROM judges WHERE id = ?')
    .get(verified.judgeId)) as Judge | undefined;
  // The token must still match the judge's event (judge reassigned/deleted invalidates).
  if (!row || row.event_id !== verified.eventId) return null;
  return row;
}

function readJudgeTokenFromHeader(req: Request): string | null {
  const header = req.headers.get('cookie') ?? '';
  const match = header.match(new RegExp(`${JUDGE_SESSION_COOKIE_NAME}=([^;]+)`));
  const token = match?.[1];
  return token ? decodeURIComponent(token) : null;
}

/** For Server Components: reads the judge session cookie. Redirects are the caller's job. */
export async function requireJudge(): Promise<Judge | null> {
  const token = cookies().get(JUDGE_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return getJudgeFromToken(token);
}

/** For Route Handlers: reads the judge session cookie from the request. */
export async function requireJudgeFromRequest(req: Request): Promise<Judge | null> {
  const token = readJudgeTokenFromHeader(req);
  if (!token) return null;
  return getJudgeFromToken(token);
}
