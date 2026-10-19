import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getDb, migrate } from '@/lib/db';
import { ensureCertificateColumns } from '@/lib/certificate-columns';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';
import { uniqueCertificateCode } from '@/lib/certificate-codes';
import { sendEmail } from '@/lib/email';
import { isIndividualEventType } from '@/lib/types';

export const dynamic = 'force-dynamic';

const IssueSchema = z.object({
  /** Registration ids to issue certificates for. Defaults to all attended=1. */
  registration_ids: z.array(z.string()).max(2000).optional(),
});

/**
 * POST /api/events/[id]/attendance/issue-certificates — organizer only.
 * Issues QR-verified "Certificate of Participation" (type='attendee') to
 * individual registrants with attended=1. Idempotent: registrants who already
 * hold an attendee certificate for this event are skipped.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const org = await requireOrganizerFromRequest(req);
  if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await migrate();
  await ensureCertificateColumns();
  const event = await getOwnedEvent(params.id, org.id);
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  if (!isIndividualEventType((event as { event_type?: string | null }).event_type)) {
    return NextResponse.json(
      { error: 'Attendance certificates are only for webinar/seminar/workshop events' },
      { status: 400 },
    );
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = IssueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const db = getDb();
  const ids = parsed.data.registration_ids;
  const sql =
    ids && ids.length > 0
      ? `SELECT id, name, email FROM individual_registrations WHERE event_id = ? AND attended = 1 AND id IN (${ids.map(() => '?').join(',')})`
      : 'SELECT id, name, email FROM individual_registrations WHERE event_id = ? AND attended = 1';
  const args = ids && ids.length > 0 ? [params.id, ...ids] : [params.id];
  const regs = (await db.prepare(sql).all(...args)) as {
    id: string;
    name: string;
    email: string;
  }[];

  if (regs.length === 0) {
    return NextResponse.json(
      { error: 'No attended registrants found. Mark attendance first.' },
      { status: 400 },
    );
  }

  // Skip anyone who already has an attendee certificate for this event.
  const issued = (await db
    .prepare(
      "SELECT recipient_name, recipient_email FROM certificates WHERE event_id = ? AND type = 'attendee'",
    )
    .all(params.id)) as { recipient_name: string; recipient_email: string }[];
  const already = new Set(
    issued.map((i) => {
      const email = (i.recipient_email ?? '').trim().toLowerCase();
      return email ? `email:${email}` : `name:${(i.recipient_name ?? '').trim().toLowerCase()}`;
    }),
  );
  const keyOf = (name: string, email: string) => {
    const e = (email ?? '').trim().toLowerCase();
    return e ? `email:${e}` : `name:${(name ?? '').trim().toLowerCase()}`;
  };
  const fresh = regs.filter((r) => !already.has(keyOf(r.name, r.email)));

  const now = new Date().toISOString();
  const created: { name: string; email: string; code: string }[] = [];
  for (const r of fresh) {
    created.push({ name: r.name, email: r.email, code: await uniqueCertificateCode(db) });
  }
  if (created.length > 0) {
    await db.batch(
      created.map((c) => ({
        // 9 columns = 9 ? placeholders. type='attendee' renders as
        // "Certificate of Participation" on the verify page.
        sql: "INSERT INTO certificates (id, event_id, recipient_name, recipient_email, type, verification_code, created_at) VALUES (?, ?, ?, ?, 'attendee', ?, ?)",
        args: [randomUUID(), params.id, c.name, c.email, c.code, now],
      })),
    );
  }

  // Email each recipient their certificate link (best-effort; logged when skipped).
  let emailed = 0;
  for (const c of created) {
    if (!c.email) continue;
    const link = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/cert/${c.code}`;
    const res = await sendEmail({
      eventId: params.id,
      to: c.email,
      subject: `Your certificate for ${event.name}`,
      html: `<p>Hi ${c.name},</p><p>Your <strong>Certificate of Participation</strong> for <strong>${event.name}</strong> is ready.</p><p><a href="${link}">View & download your certificate</a></p><p>Verification code: <code>${c.code}</code></p>`,
      type: 'winner',
    });
    if (res.ok) emailed += 1;
  }

  return NextResponse.json(
    {
      ok: true,
      issued: created.length,
      skipped: regs.length - created.length,
      emailed,
      certificates: created,
    },
    { status: 201 },
  );
}
