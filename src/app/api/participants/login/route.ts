import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDb, migrate } from '@/lib/db';
import { setParticipantCookie } from '@/lib/participant-auth';

const LoginSchema = z.object({
  email: z.string().trim().email().max(200),
});

/** Email-based participant login — sets the session cookie. */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  }

  await migrate();
  const participant = (await getDb()
    .prepare('SELECT id, name FROM participants WHERE email = ?')
    .get(parsed.data.email.toLowerCase())) as { id: string; name: string } | undefined;

  if (!participant) {
    return NextResponse.json(
      { error: 'No account found with this email — please sign up first.' },
      { status: 404 },
    );
  }

  const res = NextResponse.json({ ok: true, redirect: '/p' });
  res.headers.append('Set-Cookie', setParticipantCookie(participant.id));
  return res;
}
