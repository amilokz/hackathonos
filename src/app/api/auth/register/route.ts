import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { getDb, migrate } from '@/lib/db';
import { hashPassword, createSession, SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE } from '@/lib/auth';

const RegisterSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(160),
  password: z.string().min(8).max(128),
  invite_code: z.string().trim().min(4).max(32).optional(),
});

function sessionCookie(token: string) {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Name (2+ chars), valid email and password (8+ chars) are required' }, { status: 400 });
  }
  const { name, email, password, invite_code } = parsed.data;

  await migrate();
  const db = getDb();
  const existing = await db.prepare('SELECT id FROM organizers WHERE email = ?').get(email);
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
  }

  // PRODUCTION SECURITY: organizer registration is invite-only.
  // Exception: the very first organizer account (fresh DB bootstrap).
  const organizerCount = (
    (await db.prepare('SELECT COUNT(*) AS c FROM organizers').get()) as { c: number }
  ).c;
  if (organizerCount > 0) {
    const code = (invite_code || '').trim().toUpperCase();
    if (!code) {
      return NextResponse.json(
        { error: 'An invite code is required to create an organizer account.' },
        { status: 403 }
      );
    }
    const invite = (await db
      .prepare('SELECT code, used_by FROM organizer_invites WHERE code = ?')
      .get(code)) as { code: string; used_by: string | null } | undefined;
    if (!invite) {
      return NextResponse.json({ error: 'Invalid invite code.' }, { status: 403 });
    }
    if (invite.used_by) {
      return NextResponse.json({ error: 'This invite code has already been used.' }, { status: 403 });
    }
    // Mark invite as used (do it before insert so failures don't leave dangling state).
    const now = new Date().toISOString();
    await db
      .prepare('UPDATE organizer_invites SET used_by = ?, used_at = ? WHERE code = ?')
      .run(email, now, code);
  }

  const id = uuid();
  const password_hash = await hashPassword(password);
  const now = new Date().toISOString();
  await db.prepare('INSERT INTO organizers (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, name, email, password_hash, now);

  const res = NextResponse.json({ ok: true }, { status: 201 });
  res.cookies.set(sessionCookie(createSession(id)));
  return res;
}
