import { NextRequest, NextResponse } from 'next/server';

/**
 * Newsletter signup stub. Validates the email shape and returns {ok:true}.
 * Wire up a real provider (e.g. a mailing-list table or external service)
 * here when newsletter delivery is built.
 */
export async function POST(req: NextRequest) {
  let email = '';
  try {
    const body = await req.json();
    email = String(body?.email ?? '').trim();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: 'Please enter a valid email address' }, { status: 400 });
  }

  // TODO: persist the subscriber / forward to a mailing-list provider.
  return NextResponse.json({ ok: true });
}
