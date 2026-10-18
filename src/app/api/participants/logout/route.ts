import { NextResponse } from 'next/server';
import { clearParticipantCookie } from '@/lib/participant-auth';

/** Signs the participant out by expiring the session cookie. */
export async function POST() {
  const res = NextResponse.json({ ok: true, redirect: '/p/login' });
  res.headers.append('Set-Cookie', clearParticipantCookie());
  return res;
}
