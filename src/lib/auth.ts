import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const SALT_ROUNDS = 10;
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET env var is not set');
  }
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

interface SessionPayload {
  sub: string; // organizer id
  iat: number; // issued-at ms
  exp: number; // expiry ms
}

function sign(data: string): string {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('hex');
}

/** Creates a signed session token for an organizer id. */
export function createSession(organizerId: string): string {
  const payload: SessionPayload = {
    sub: organizerId,
    iat: Date.now(),
    exp: Date.now() + SESSION_MAX_AGE_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

/**
 * Verifies a session token. Returns the organizer id, or null when the
 * token is malformed, tampered with, or expired.
 */
export function verifySession(token: string): string | null {
  try {
    const [body, signature] = token.split('.');
    if (!body || !signature) return null;
    const expected = sign(body);
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.sub || typeof payload.exp !== 'number') return null;
    if (Date.now() > payload.exp) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = 'hackathonos_session';
export const SESSION_COOKIE_MAX_AGE = SESSION_MAX_AGE_MS / 1000;
