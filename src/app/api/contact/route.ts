import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest } from '@/lib/require-organizer';

/**
 * GET /api/contact — organizer-only inbox listing (newest first).
 * Returns 401 without a valid organizer session cookie.
 *
 * POST /api/contact — public contact form submission.
 *
 * Validates name/email/message, enforces a simple per-IP rate limit
 * (max 5 submissions per IP per hour, in-memory), and stores the message
 * in the `contact_messages` table for organizers to read in the dashboard.
 * Messages are never exposed publicly.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_NAME = 120;
const MAX_SUBJECT = 160;
const MAX_MESSAGE = 10000;
const MIN_MESSAGE = 10;

// In-memory per-IP rate limit: IP -> array of submission timestamps (ms).
// Resets on process restart; a cheap, dependency-free throttle.
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_MAX = 5;
const rateBuckets = new Map<string, number[]>();

function clientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip) ?? [];
  const fresh = bucket.filter((t) => now - t < RATE_WINDOW_MS);
  if (fresh.length >= RATE_MAX) {
    rateBuckets.set(ip, fresh);
    return true;
  }
  fresh.push(now);
  rateBuckets.set(ip, fresh);
  return false;
}

export async function POST(req: NextRequest) {
  if (isRateLimited(clientIp(req))) {
    return NextResponse.json(
      { error: 'Too many messages. Please try again later.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { name, email, subject, message } = (body ?? {}) as {
    name?: unknown;
    email?: unknown;
    subject?: unknown;
    message?: unknown;
  };

  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim() : '';
  const cleanSubject = typeof subject === 'string' ? subject.trim() : '';
  const cleanMessage = typeof message === 'string' ? message.trim() : '';

  if (!cleanName) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  if (cleanName.length > MAX_NAME)
    return NextResponse.json({ error: `Name must be ${MAX_NAME} characters or fewer.` }, { status: 400 });
  if (!cleanEmail || !EMAIL_RE.test(cleanEmail))
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
  if (cleanMessage.length < MIN_MESSAGE)
    return NextResponse.json(
      { error: `Message must be at least ${MIN_MESSAGE} characters.` },
      { status: 400 }
    );
  if (cleanMessage.length > MAX_MESSAGE)
    return NextResponse.json({ error: `Message must be ${MAX_MESSAGE} characters or fewer.` }, { status: 400 });
  if (cleanSubject.length > MAX_SUBJECT)
    return NextResponse.json({ error: `Subject must be ${MAX_SUBJECT} characters or fewer.` }, { status: 400 });

  await migrate();
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      'INSERT INTO contact_messages (id, name, email, subject, message, created_at, read) VALUES (?, ?, ?, ?, ?, ?, 0)'
    )
    .run(id, cleanName, cleanEmail, cleanSubject, cleanMessage, now);

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const org = await requireOrganizerFromRequest(req);
  if (!org) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  await migrate();
  const db = getDb();
  const messages = (await db
    .prepare(
      'SELECT id, name, email, subject, message, created_at, read FROM contact_messages ORDER BY created_at DESC'
    )
    .all()) as Array<{
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    created_at: string;
    read: number;
  }>;
  return NextResponse.json({ messages });
}
