import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { getDb, migrate } from '@/lib/db';
import { setParticipantCookie } from '@/lib/participant-auth';

const SignupSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  skills: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  bio: z.string().trim().max(2000).default(''),
});

/** Create a participant account and sign in (sets the session cookie). */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Name (2+ chars) and a valid email are required' }, { status: 400 });
  }

  await migrate();
  const db = getDb();
  const email = parsed.data.email.toLowerCase();
  const existing = await db.prepare('SELECT id FROM participants WHERE email = ?').get(email);
  if (existing) {
    return NextResponse.json(
      { error: 'An account with this email already exists — please log in instead.' },
      { status: 409 },
    );
  }

  const id = uuid();
  const now = new Date().toISOString();
  const skills = Array.from(new Set(parsed.data.skills.map((s) => s.trim()).filter(Boolean))).join(', ');
  await db
    .prepare(
      'INSERT INTO participants (id, name, email, skills, bio, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(id, parsed.data.name, email, skills, parsed.data.bio, now);

  const res = NextResponse.json({ ok: true, id, redirect: '/p' }, { status: 201 });
  res.headers.append('Set-Cookie', setParticipantCookie(id));
  return res;
}
