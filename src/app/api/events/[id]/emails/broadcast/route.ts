import { NextRequest } from 'next/server';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';
import { broadcastMessage, sendEmail, approvedTeamContactEmails } from '@/lib/email';

export const dynamic = 'force-dynamic';

const BROADCAST_COOLDOWN_MS = 5 * 60 * 1000; // max 1 broadcast per 5 minutes per event

/** POST /api/events/[id]/emails/broadcast — send a message to all approved teams (organizer only). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await migrate();
  const organizer = await requireOrganizerFromRequest(req);
  if (!organizer) return Response.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, organizer.id);
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  let body: { subject?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const subject = String(body.subject ?? '').trim();
  const message = String(body.message ?? '').trim();
  if (!subject) return Response.json({ error: 'subject is required' }, { status: 400 });
  if (!message) return Response.json({ error: 'message is required' }, { status: 400 });
  if (subject.length > 160) {
    return Response.json({ error: 'subject must be 160 characters or fewer' }, { status: 400 });
  }
  if (message.length > 5000) {
    return Response.json({ error: 'message must be 5000 characters or fewer' }, { status: 400 });
  }

  // Rate limit: at most one broadcast per 5 minutes per event.
  const db = getDb();
  const since = new Date(Date.now() - BROADCAST_COOLDOWN_MS).toISOString();
  const recent = (await db
    .prepare(
      `SELECT id FROM email_log WHERE event_id = ? AND type = 'broadcast' AND sent_at >= ? LIMIT 1`,
    )
    .get(params.id, since)) as { id: string } | undefined;
  if (recent) {
    return Response.json(
      { error: 'A broadcast was sent within the last 5 minutes — please wait before sending another.' },
      { status: 429 },
    );
  }

  const emails = await approvedTeamContactEmails(params.id);
  const template = broadcastMessage(event.name, subject, message);
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const to of emails) {
    const result = await sendEmail({
      eventId: params.id,
      to,
      subject: template.subject,
      html: template.html,
      type: 'broadcast',
    });
    if (result.skipped) skipped++;
    else if (result.ok) sent++;
    else failed++;
  }

  return Response.json({ ok: true, total: emails.length, sent, skipped, failed });
}
