import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { getDb, migrate } from '@/lib/db';
import { hashPassword, createSession, SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE } from '@/lib/auth';

const RegisterSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(160),
  password: z.string().min(8).max(128),
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
  const { name, email, password } = parsed.data;

  await migrate();
  const db = getDb();
  const existing = await db.prepare('SELECT id FROM organizers WHERE email = ?').get(email);
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
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
