import { NextRequest, NextResponse } from 'next/server';
import { getDb, migrate } from '@/lib/db';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cron/webinar-reminders — sends "starting today" reminder emails to
 * individual registrants of webinar/seminar/workshop events whose start_date is
 * today and who have not been reminded yet.
 *
 * Idempotent: reminder_sent is set to 1 after sending, so re-running never
 * double-sends. Protected by CRON_SECRET when set (pass ?secret=...).
 *
 * NOTE: event start dates are date-only (no time), so the reminder goes out on
 * the event day. Hit this endpoint on a schedule (e.g. every morning at 08:00)
 * from an external cron service — see HANDOVER.md.
 */
export async function GET(req: NextRequest) {
  const required = process.env.CRON_SECRET;
  if (required) {
    const got = req.nextUrl.searchParams.get('secret');
    if (got !== required) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  await migrate();
  const db = getDb();

  // Events happening today (local calendar day), non-hackathon types, published.
  const events = (await db
    .prepare(
      `SELECT id, name, meeting_link, whatsapp_group_link
       FROM events
       WHERE status = 'published'
         AND event_type IN ('webinar', 'seminar', 'workshop')
         AND date(start_date) = date('now', 'localtime')`,
    )
    .all()) as {
    id: string;
    name: string;
    meeting_link: string | null;
    whatsapp_group_link: string | null;
  }[];

  let sent = 0;
  let skipped = 0;
  for (const event of events) {
    const regs = (await db
      .prepare(
        'SELECT id, name, email FROM individual_registrations WHERE event_id = ? AND reminder_sent = 0',
      )
      .all(event.id)) as { id: string; name: string; email: string }[];

    for (const r of regs) {
      const meetingLine = event.meeting_link?.trim()
        ? `<p><strong>Join link:</strong> <a href="${event.meeting_link.trim()}">${event.meeting_link.trim()}</a></p>`
        : '';
      const waLine = event.whatsapp_group_link?.trim()
        ? `<p><a href="${event.whatsapp_group_link.trim()}">Join the WhatsApp group</a> for live updates.</p>`
        : '';
      const res = await sendEmail({
        eventId: event.id,
        to: r.email,
        subject: `Starting today: ${event.name}`,
        html: `<p>Hi ${r.name},</p><p>Reminder: <strong>${event.name}</strong> starts today.</p>${meetingLine}${waLine}<p>See you there!</p>`,
        type: 'deadline',
      });
      // Mark as sent regardless of skipped_no_key vs real send — the point is
      // one reminder per registrant. A failed send is logged in email_log.
      await db
        .prepare('UPDATE individual_registrations SET reminder_sent = 1 WHERE id = ?')
        .run(r.id);
      if (res.ok) sent += 1;
      else skipped += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    events_checked: events.length,
    reminders_sent: sent,
    reminders_skipped_no_key: skipped,
  });
}
