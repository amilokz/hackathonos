import crypto from 'node:crypto';
import { Resend } from 'resend';
import { getDb } from './db';

const FROM = 'HackathonOS <noreply@akclnt.com>';

export type EmailType = 'registration' | 'deadline' | 'winner' | 'broadcast';

/** Returns a Resend client when RESEND_API_KEY is configured, else null. */
export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

interface SendEmailArgs {
  eventId: string;
  to: string;
  subject: string;
  html: string;
  type: EmailType;
}

export interface SendEmailResult {
  ok: boolean;
  skipped: boolean;
}

/**
 * Sends one email and appends a row to email_log. When no Resend key is
 * configured the send is skipped: the row is logged with
 * status='skipped_no_key' so the organizer can still see what would have
 * gone out. Never throws — callers can rely on the returned result.
 */
export async function sendEmail({ eventId, to, subject, html, type }: SendEmailArgs): Promise<SendEmailResult> {
  const db = getDb();
  const id = crypto.randomUUID();
  const sent_at = new Date().toISOString();
  const client = getResend();
  if (!client) {
    console.log(`[email:skipped_no_key] event=${eventId} to=${to} type=${type} subject=${subject}`);
    await db
      .prepare(
        'INSERT INTO email_log (id, event_id, to_email, subject, type, sent_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(id, eventId, to, subject, type, sent_at, 'skipped_no_key');
    return { ok: false, skipped: true };
  }
  try {
    const { error } = await client.emails.send({ from: FROM, to, subject, html });
    if (error) throw new Error(error.message);
    await db
      .prepare(
        'INSERT INTO email_log (id, event_id, to_email, subject, type, sent_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(id, eventId, to, subject, type, sent_at, 'sent');
    return { ok: true, skipped: false };
  } catch (e) {
    const msg = (e instanceof Error ? e.message : String(e)).slice(0, 200);
    console.error(`[email:failed] event=${eventId} to=${to} type=${type}: ${msg}`);
    await db
      .prepare(
        'INSERT INTO email_log (id, event_id, to_email, subject, type, sent_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(id, eventId, to, subject, type, sent_at, `failed: ${msg}`);
    return { ok: false, skipped: false };
  }
}

/* ---------------- Template helpers ---------------- */

/** Deduped contact emails of all approved teams for an event. */
export async function approvedTeamContactEmails(eventId: string): Promise<string[]> {
  const db = getDb();
  const rows = (await db
    .prepare(
      `SELECT contact_email FROM teams
       WHERE event_id = ? AND approval_status = 'approved'
       AND contact_email IS NOT NULL AND TRIM(contact_email) != ''`,
    )
    .all(eventId)) as { contact_email: string }[];
  const seen = new Set<string>();
  for (const r of rows) {
    const email = r.contact_email.trim().toLowerCase();
    if (email && !seen.has(email)) seen.add(email);
  }
  return Array.from(seen);
}

function shell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:24px 16px;">
<div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
<div style="background:#4f46e5;padding:20px 24px;">
<p style="margin:0;color:#ffffff;font-weight:800;font-size:18px;letter-spacing:-0.02em;">⚡ HackathonOS</p>
</div>
<div style="padding:24px;">
<h1 style="margin:0 0 12px;color:#0f172a;font-size:20px;letter-spacing:-0.02em;">${title}</h1>
<div style="color:#334155;font-size:15px;line-height:1.6;">${bodyHtml}</div>
</div>
<div style="border-top:1px solid #e2e8f0;padding:16px 24px;background:#f8fafc;">
<p style="margin:0;color:#94a3b8;font-size:12px;">Sent via HackathonOS. You're receiving this because your team is registered for this event.</p>
</div>
</div>
</div>
</body></html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function registrationConfirmation(
  eventName: string,
  teamName: string,
): { subject: string; html: string } {
  const subject = `You're in! ${teamName} is registered for ${eventName}`;
  const html = shell(
    `Welcome to ${esc(eventName)}, ${esc(teamName)}! 🎉`,
    `<p>Your team <strong>${esc(teamName)}</strong> has been successfully registered for <strong>${esc(
      eventName,
    )}</strong>.</p>
     <p>Keep an eye on your inbox — we'll send deadline reminders, judging updates and winner announcements right here.</p>
     <p style="margin:0;">Good luck building! 🚀</p>`,
  );
  return { subject, html };
}

export function deadlineReminder(
  eventName: string,
  deadlineStr: string,
): { subject: string; html: string } {
  const subject = `⏰ Deadline reminder: ${eventName}`;
  const html = shell(
    '⏰ Submission deadline is approaching',
    `<p>The submission deadline for <strong>${esc(eventName)}</strong> is <strong>${esc(
      deadlineStr,
    )}</strong>.</p>
     <p>Make sure your project demo link, repo and pitch are submitted before time runs out.</p>
     <p style="margin:0;">You've got this — finish strong! 💪</p>`,
  );
  return { subject, html };
}

export function winnerAnnouncement(
  eventName: string,
  customMessage: string,
): { subject: string; html: string } {
  const subject = `🏆 ${eventName} results are out!`;
  const body = esc(customMessage).replace(/\n/g, '<br>');
  const html = shell(
    `🏆 ${esc(eventName)} — results announced`,
    `<p>${body}</p>
     <p style="margin:0;">Congratulations to all winners, and thank you to every team that built something awesome. 🎉</p>`,
  );
  return { subject, html };
}

export function broadcastMessage(
  eventName: string,
  subject: string,
  messageHtml: string,
): { subject: string; html: string } {
  const body = esc(messageHtml).replace(/\n/g, '<br>');
  const html = shell(`${esc(eventName)} — update`, `<p>${body}</p>`);
  return { subject, html };
}
