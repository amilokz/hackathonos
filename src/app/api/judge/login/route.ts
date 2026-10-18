import { NextRequest, NextResponse } from 'next/server';
import { getDb, migrate } from '@/lib/db';
import {
  createJudgeSession,
  JUDGE_SESSION_COOKIE_NAME,
  JUDGE_SESSION_COOKIE_MAX_AGE,
} from '@/lib/judge-auth';

/**
 * Judge login. Body: { code } — the judge's access code (e.g. JUDGE-XXXXX).
 * Sets a signed httpOnly cookie on success.
 */
export async function POST(req: NextRequest) {
  await migrate();

  const body = await req.json().catch(() => null);
  const code = String(body?.code ?? '').trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: 'Access code is required' }, { status: 400 });
  }

  const judge = (await getDb()
    .prepare('SELECT id, event_id, name, email FROM judges WHERE access_code = ?')
    .get(code)) as { id: string; event_id: string; name: string; email: string } | undefined;

  if (!judge) {
    return NextResponse.json({ error: 'Invalid access code' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, judge: { name: judge.name, event_id: judge.event_id } });
  res.cookies.set({
    name: JUDGE_SESSION_COOKIE_NAME,
    value: createJudgeSession(judge.id, judge.event_id),
    httpOnly: true,
    path: '/',
    maxAge: JUDGE_SESSION_COOKIE_MAX_AGE,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
