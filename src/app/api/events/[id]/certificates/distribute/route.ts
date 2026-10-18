import { randomUUID } from 'node:crypto';
import { getDb, migrate } from '@/lib/db';
import { ensureCertificateColumns } from '@/lib/certificate-columns';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';
import { getRecipientPools, type DistributeRecipient } from '@/lib/certificate-recipients';
import { uniqueCertificateCode } from '@/lib/certificate-codes';

export const dynamic = 'force-dynamic';

const CERT_TYPES = ['participant', 'winner', 'judge', 'sponsor'] as const;

interface DistributeBody {
  /** Certificate template to distribute. */
  template_id?: string;
  type?: string;
  /** Any of: "teams" (all approved team members), "winners" (top-3 members). */
  groups?: string[];
  /** Custom entries: { name, email } — same "Name,email" semantics as the textarea. */
  entries?: { name?: string; email?: string }[];
}

function recipientKey(r: DistributeRecipient | { name: string; email: string }): string {
  const email = (r.email ?? '').trim().toLowerCase();
  if (email) return `email:${email}`;
  return `name:${(r.name ?? '').trim().toLowerCase()}`;
}

/**
 * POST /api/events/[id]/certificates/distribute — bulk-issue certificates from
 * a PDF template (organizer only). One `certificates` row per recipient with a
 * unique verification code, linking pdf_url + template_id.
 *
 * Idempotency: recipients who already hold a certificate issued from this same
 * template are skipped (returns them as `skipped`).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  await migrate();
  await ensureCertificateColumns();
  const organizer = await requireOrganizerFromRequest(req);
  if (!organizer) return Response.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, organizer.id);
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  let body: DistributeBody;
  try {
    body = (await req.json()) as DistributeBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const type = (body.type ?? 'participant').toLowerCase();
  if (!(CERT_TYPES as readonly string[]).includes(type)) {
    return Response.json(
      { error: `type must be one of: ${CERT_TYPES.join(', ')}` },
      { status: 400 },
    );
  }

  const templateId = (body.template_id ?? '').trim();
  if (!templateId) {
    return Response.json({ error: 'template_id is required' }, { status: 400 });
  }
  const db = getDb();
  const template = (await db
    .prepare('SELECT id, name, pdf_url FROM certificate_templates WHERE id = ? AND event_id = ?')
    .get(templateId, params.id)) as
    | { id: string; name: string; pdf_url: string }
    | undefined;
  if (!template) {
    return Response.json({ error: 'Certificate template not found' }, { status: 404 });
  }

  // Gather recipients from the selected groups + the custom list.
  const groups = new Set((body.groups ?? []).map((g) => String(g).toLowerCase()));
  const pool = groups.size > 0 ? await getRecipientPools(params.id) : null;

  const candidates: DistributeRecipient[] = [];
  if (groups.has('teams') && pool) {
    candidates.push(...pool.teamMembers.map((m) => ({ ...m })));
  }
  if (groups.has('winners') && pool) {
    candidates.push(...pool.winners.map((m) => ({ ...m })));
  }
  if (Array.isArray(body.entries)) {
    for (const e of body.entries) {
      const name = (e?.name ?? '').trim();
      if (!name) continue;
      candidates.push({ name, email: (e?.email ?? '').trim(), team_name: '' });
    }
  }

  // De-duplicate within this batch (email wins over bare name).
  const seen = new Set<string>();
  const unique: DistributeRecipient[] = [];
  for (const c of candidates) {
    const key = recipientKey(c);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(c);
  }

  if (unique.length === 0) {
    return Response.json({ error: 'No recipients selected' }, { status: 400 });
  }
  if (unique.length > 2000) {
    return Response.json({ error: 'Too many recipients (max 2000 per request)' }, { status: 400 });
  }

  // Skip recipients who already got a certificate from this template.
  const issued = (await db
    .prepare(
      'SELECT recipient_name, recipient_email FROM certificates WHERE event_id = ? AND template_id = ?',
    )
    .all(params.id, templateId)) as { recipient_name: string; recipient_email: string }[];
  const alreadyKeys = new Set(
    issued.map((i) => {
      const email = (i.recipient_email ?? '').trim().toLowerCase();
      return email ? `email:${email}` : `name:${(i.recipient_name ?? '').trim().toLowerCase()}`;
    }),
  );

  const toCreate = unique.filter((u) => !alreadyKeys.has(recipientKey(u)));
  const skipped = unique.length - toCreate.length;

  const now = new Date().toISOString();
  const created: { name: string; email: string; code: string }[] = [];
  for (const u of toCreate) {
    const code = await uniqueCertificateCode(db);
    created.push({ name: u.name, email: u.email, code });
  }
  if (created.length > 0) {
    await db.batch(
      created.map((c) => ({
        sql: 'INSERT INTO certificates (id, event_id, recipient_name, recipient_email, type, verification_code, pdf_url, template_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        args: [randomUUID(), params.id, c.name, c.email, type, c.code, template.pdf_url, templateId, now],
      })),
    );
  }

  return Response.json(
    {
      ok: true,
      count: created.length,
      skipped,
      template: { id: template.id, name: template.name },
      type,
      created,
    },
    { status: 201 },
  );
}
