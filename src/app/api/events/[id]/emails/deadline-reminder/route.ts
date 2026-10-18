import { NextRequest } from 'next/server';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';
import { deadlineReminder, sendEmail, approvedTeamContactEmails } from '@/lib/email';

export const dynamic = 'force-dynamic';

/** POST /api/events/[id]/emails/deadline-reminder — email all approved teams about the submission deadline (organizer only). */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  await migrate();
  const organizer = await requireOrganizerFromRequest(req);
  if (!organizer) return Response.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, organizer.id);
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  const db = getDb();
  const row = (await db
    .prepare('SELECT name, end_date FROM events WHERE id = ?')
    .get(params.id)) as { name: string; end_date: string } | undefined;
  let deadlineStr = 'soon';
  if (row?.end_date) {
    const d = new Date(row.end_date);
    if (!Number.isNaN(d.getTime())) {
      deadlineStr = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } else {
      deadlineStr = row.end_date;
    }
  }

  const emails = await approvedTeamContactEmails(params.id);
  const template = deadlineReminder(row?.name ?? event.name, deadlineStr);
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const to of emails) {
    const result = await sendEmail({
      eventId: params.id,
      to,
      subject: template.subject,
      html: template.html,
      type: 'deadline',
    });
    if (result.skipped) skipped++;
    else if (result.ok) sent++;
    else failed++;
  }

  return Response.json({ ok: true, total: emails.length, sent, skipped, failed, deadline: deadlineStr });
}
