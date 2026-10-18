import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { getDb, migrate } from '@/lib/db';
import { logActivity } from '@/lib/activity';
import { registrationConfirmation, sendEmail } from '@/lib/email';

const CreateTeamSchema = z.object({
  eventId: z.string().trim().min(1),
  name: z.string().trim().min(2).max(80),
  contact_name: z.string().trim().max(80).default(''),
  contact_email: z.string().trim().toLowerCase().email().max(160),
  contact_phone: z.string().trim().max(30).default(''),
  members: z.array(z.string().trim().max(80)).max(10).default([]),
});

/** Register a team for a published event. Public endpoint. */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = CreateTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Team name and a valid contact email are required' }, { status: 400 });
  }
  const data = parsed.data;

  await migrate();
  const db = getDb();
  const event = await db.prepare('SELECT id, name, status, require_team_approval FROM events WHERE id = ?').get(data.eventId) as
    | { id: string; name: string; status: string; require_team_approval: number | null }
    | undefined;
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (event.status !== 'published') {
    const closed = event.status === 'closed';
    return NextResponse.json(
      {
        error: closed
          ? 'Registrations are closed — this hackathon has ended'
          : 'Registrations are not open for this event yet',
      },
      { status: 403 },
    );
  }

  const clash = await db
    .prepare('SELECT id FROM teams WHERE event_id = ? AND lower(name) = lower(?)')
    .get(data.eventId, data.name);
  if (clash) {
    return NextResponse.json({ error: 'A team with this name already registered for the event' }, { status: 409 });
  }

  const id = uuid();
  const now = new Date().toISOString();
  const members = data.members.filter((m) => m.length > 0);
  const approval_status = event.require_team_approval ? 'pending' : 'approved';
  try {
    await db.prepare(
      `INSERT INTO teams (id, event_id, name, contact_name, contact_email, contact_phone, members_json, approval_status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, data.eventId, data.name, data.contact_name, data.contact_email, data.contact_phone, JSON.stringify(members), approval_status, now);
  } catch {
    return NextResponse.json({ error: 'A team with this name already registered for the event' }, { status: 409 });
  }

  // Fire-and-forget dashboard activity log — never blocks registration.
  void logActivity(db, data.eventId, 'team_registered', `Team "${data.name}" registered`);

  // Fire-and-forget registration confirmation email — never blocks registration.
  (async () => {
    try {
      const { subject, html } = registrationConfirmation(event.name, data.name);
      await sendEmail({ eventId: data.eventId, to: data.contact_email, subject, html, type: 'registration' });
    } catch (e) {
      console.error('[email] registration confirmation failed:', e);
    }
  })();

  return NextResponse.json({ ok: true, id, approval_status }, { status: 201 });
}
