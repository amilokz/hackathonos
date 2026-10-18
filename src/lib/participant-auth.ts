import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { getDb } from './db';

const PARTICIPANT_SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const PARTICIPANT_SESSION_COOKIE_NAME = 'hackathonos_participant';
export const PARTICIPANT_SESSION_COOKIE_MAX_AGE = PARTICIPANT_SESSION_MAX_AGE_MS / 1000;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET env var is not set');
  }
  return secret;
}

interface ParticipantSessionPayload {
  sub: string; // participant id
  iat: number;
  exp: number;
}

function sign(data: string): string {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('hex');
}

/** Creates a signed session token for a participant. */
export function createParticipantSession(participantId: string): string {
  const payload: ParticipantSessionPayload = {
    sub: participantId,
    iat: Date.now(),
    exp: Date.now() + PARTICIPANT_SESSION_MAX_AGE_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

/**
 * Verifies a participant session token.
 * Returns the participant id, or null when malformed, tampered with, or expired.
 */
export function verifyParticipantSession(token: string): string | null {
  try {
    const [body, signature] = token.split('.');
    if (!body || !signature) return null;
    const expected = sign(body);
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as ParticipantSessionPayload;
    if (!payload.sub || typeof payload.exp !== 'number') return null;
    if (Date.now() > payload.exp) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export interface Participant {
  id: string;
  name: string;
  email: string;
  skills: string;
  bio: string;
  created_at: string;
}

/** Loads the participant row for a verified token, or null. */
export async function getParticipantFromToken(token: string): Promise<Participant | null> {
  const participantId = verifyParticipantSession(token);
  if (!participantId) return null;
  const row = (await getDb()
    .prepare('SELECT id, name, email, skills, bio, created_at FROM participants WHERE id = ?')
    .get(participantId)) as Participant | undefined;
  return row ?? null;
}

function readTokenFromHeader(req: Request): string | null {
  const header = req.headers.get('cookie') ?? '';
  const match = header.match(new RegExp(`${PARTICIPANT_SESSION_COOKIE_NAME}=([^;]+)`));
  const token = match?.[1];
  return token ? decodeURIComponent(token) : null;
}

/** For Server Components: reads the participant session cookie. Redirects are the caller's job. */
export async function requireParticipant(): Promise<Participant | null> {
  const token = cookies().get(PARTICIPANT_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return getParticipantFromToken(token);
}

/** For Route Handlers: reads the participant session cookie from the request. */
export async function getParticipantFromRequest(req: Request): Promise<Participant | null> {
  const token = readTokenFromHeader(req);
  if (!token) return null;
  return getParticipantFromToken(token);
}

function cookieValue(token: string, maxAge: number): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${PARTICIPANT_SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

/**
 * Returns a Set-Cookie header value that signs the participant in.
 * Attach it to the response: `res.headers.append('Set-Cookie', setParticipantCookie(id))`.
 */
export function setParticipantCookie(participantId: string): string {
  return cookieValue(createParticipantSession(participantId), PARTICIPANT_SESSION_COOKIE_MAX_AGE);
}

/** Returns a Set-Cookie header value that expires the participant session. */
export function clearParticipantCookie(): string {
  return cookieValue('', 0);
}
