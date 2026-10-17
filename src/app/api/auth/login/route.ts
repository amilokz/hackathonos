import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, migrate } from '@/lib/db';
import { verifyPassword, createSession, SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE } from '@/lib/auth';

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  await migrate();
  const db = getDb();
  const row = await db
    .prepare('SELECT id, password_hash FROM organizers WHERE email = ?')
    .get(parsed.data.email) as { id: string; password_hash: string } | undefined;

  if (!row || !(await verifyPassword(parsed.data.password, row.password_hash))) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: createSession(row.id),
    httpOnly: true,
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
