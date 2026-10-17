import { NextRequest, NextResponse } from 'next/server';
import { getDb, migrate } from '@/lib/db';
import type { TeamRow } from '@/lib/types';

/**
 * Look up teams by contact email within an event.
 * Used by the project-submission page so teams can claim their entry.
 * Public endpoint — returns only non-sensitive team fields.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = (searchParams.get('email') || '').trim().toLowerCase();
  const eventId = (searchParams.get('eventId') || '').trim();
  if (!email || !eventId) {
    return NextResponse.json({ error: 'email and eventId are required' }, { status: 400 });
  }

  await migrate();
  const teams = await getDb()
    .prepare('SELECT id, name, contact_name FROM teams WHERE event_id = ? AND lower(contact_email) = lower(?) ORDER BY created_at ASC')
    .all(eventId, email) as Pick<TeamRow, 'id' | 'name' | 'contact_name'>[];

  return NextResponse.json({ teams });
}
