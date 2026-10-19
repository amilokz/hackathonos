import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';
import { sendEmail } from '@/lib/email';
import { isIndividualEventType } from '@/lib/types';

export const dynamic = 'force-dynamic';

const RegisterSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).default(''),
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/events/[id]/register-individual — public individual registration
 * for webinar/seminar/workshop events (no teams involved).
 * 409 when this email already registered for the event.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await migrate();
  const db = getDb();

  const event = (await db.prepare('SELECT * FROM events WHERE id = ?').get(params.id)) as
    | { id: string; name: string; status: string; event_type: string | null; meeting_link: string | null; whatsapp_group_link: string | null }
    | undefined;
  if (!event || (event.status !== 'published' && event.status !== 'closed')) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }
  if (event.status === 'closed') {
    return NextResponse.json({ error: 'Registrations are closed for this event' }, { status: 409 });
  }
  if (!isIndividualEventType(event.event_type)) {
    return NextResponse.json(
      { error: 'This event uses team registration instead' },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Name and a valid email are required' }, { status: 400 });
  }
  const email = parsed.data.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
  }

  const existing = await db
    .prepare('SELECT id FROM individual_registrations WHERE event_id = ? AND email = ?')
    .get(event.id, email);
  if (existing) {
    return NextResponse.json(
      { error: 'This email is already registered for this event' },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const id = randomUUID();
  await db
    .prepare(
      'INSERT INTO individual_registrations (id, event_id, name, email, phone, attended, reminder_sent, created_at) VALUES (?, ?, ?, ?, ?, 0, 0, ?)',
    )
    .run(id, event.id, parsed.data.name.trim(), email, parsed.data.phone.trim(), now);

  // Confirmation email (best-effort; logged as skipped_no_key when no Resend key).
  const meetingLine = event.meeting_link?.trim()
    ? `<p>Join link: <a href="${event.meeting_link.trim()}">${event.meeting_link.trim()}</a></p>`
    : '';
  const waLine = event.whatsapp_group_link?.trim()
    ? `<p><a href="${event.whatsapp_group_link.trim()}">Join the WhatsApp group</a> for updates and announcements.</p>`
    : '';
  await sendEmail({
    eventId: event.id,
    to: email,
    subject: `You're registered for ${event.name}`,
    html: `<p>Hi ${parsed.data.name.trim()},</p><p>You're registered for <strong>${event.name}</strong>.</p>${meetingLine}${waLine}<p>We'll email you a reminder before it starts.</p>`,
    type: 'registration',
  });

  return NextResponse.json({ ok: true, id }, { status: 201 });
}

async function ownedEvent(req: NextRequest, id: string) {
  const org = await requireOrganizerFromRequest(req);
  if (!org) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  await migrate();
  const event = await getOwnedEvent(id, org.id);
  if (!event) return { error: NextResponse.json({ error: 'Event not found' }, { status: 404 }) };
  return { org, event };
}

/** GET — organizer lists individual registrants for their event. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await ownedEvent(req, params.id);
  if (result.error) return result.error;
  const db = getDb();
  const regs = await db
    .prepare(
      'SELECT id, name, email, phone, attended, reminder_sent, created_at FROM individual_registrations WHERE event_id = ? ORDER BY created_at ASC',
    )
    .all(params.id);
  return NextResponse.json({ registrations: regs });
}

const AttendanceSchema = z.object({
  /** Map of registration id -> attended (true/false). */
  attended: z.record(z.string(), z.boolean()),
});

/** PATCH — organizer marks attendance (bulk). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await ownedEvent(req, params.id);
  if (result.error) return result.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = AttendanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'attended map is required' }, { status: 400 });
  }

  const db = getDb();
  const items = Object.entries(parsed.data.attended);
  if (items.length > 2000) {
    return NextResponse.json({ error: 'Too many entries' }, { status: 400 });
  }
  await db.batch(
    items.map(([id, attended]) => ({
      sql: 'UPDATE individual_registrations SET attended = ? WHERE id = ? AND event_id = ?',
      args: [attended ? 1 : 0, id, params.id],
    })),
  );
  return NextResponse.json({ ok: true, updated: items.length });
}
