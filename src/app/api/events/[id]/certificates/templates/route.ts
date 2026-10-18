import { randomUUID } from 'node:crypto';
import { getDb, migrate } from '@/lib/db';
import { ensureCertificateColumns } from '@/lib/certificate-columns';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';

export const dynamic = 'force-dynamic';

interface TemplateBody {
  name?: string;
  pdf_url?: string;
}

/** GET /api/events/[id]/certificates/templates — list PDF templates (organizer only). */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  await migrate();
  await ensureCertificateColumns();
  const organizer = await requireOrganizerFromRequest(req);
  if (!organizer) return Response.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, organizer.id);
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  const db = getDb();
  const templates = await db
    .prepare(
      `SELECT ct.id, ct.name, ct.pdf_url, ct.created_at,
              (SELECT COUNT(*) FROM certificates c WHERE c.template_id = ct.id) AS issued_count
       FROM certificate_templates ct
       WHERE ct.event_id = ? ORDER BY ct.created_at DESC`,
    )
    .all(params.id);
  return Response.json({ templates });
}

/**
 * POST /api/events/[id]/certificates/templates — register an uploaded PDF as a
 * certificate template (organizer only). Upload the file first via
 * POST /api/uploads/pdf, then pass its `url` here as `pdf_url`.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  await migrate();
  await ensureCertificateColumns();
  const organizer = await requireOrganizerFromRequest(req);
  if (!organizer) return Response.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, organizer.id);
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  let body: TemplateBody;
  try {
    body = (await req.json()) as TemplateBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = (body.name ?? '').trim();
  const pdfUrl = (body.pdf_url ?? '').trim();
  if (!name) return Response.json({ error: 'Template name is required' }, { status: 400 });
  if (!pdfUrl) return Response.json({ error: 'pdf_url is required (upload the PDF first)' }, { status: 400 });

  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  await db
    .prepare(
      'INSERT INTO certificate_templates (id, event_id, name, pdf_url, created_at) VALUES (?, ?, ?, ?, ?)',
    )
    .run(id, params.id, name, pdfUrl, now);

  return Response.json(
    { ok: true, template: { id, name, pdf_url: pdfUrl, created_at: now, issued_count: 0 } },
    { status: 201 },
  );
}
