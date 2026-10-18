import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest } from '@/lib/require-organizer';

export const dynamic = 'force-dynamic';

const PDF_MIME = 'application/pdf';
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * POST /api/uploads/pdf — organizer-only PDF upload (certificate templates).
 * Accepts multipart/form-data with a single `file` field.
 * Stores the PDF as a data URL in the uploads table (same pattern as
 * /api/uploads) and returns { ok: true, id, url: "/api/uploads/<id>" }.
 */
export async function POST(req: Request) {
  await migrate();
  const organizer = await requireOrganizerFromRequest(req);
  if (!organizer) return Response.json({ error: 'Not signed in' }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return Response.json({ error: 'No file provided (field name must be "file")' }, { status: 400 });
  }
  if (file.type !== PDF_MIME) {
    return Response.json({ error: 'Only PDF files are allowed' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: 'PDF must be smaller than 5MB' }, { status: 400 });
  }
  if (file.size === 0) {
    return Response.json({ error: 'Empty file' }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  // Magic-byte sanity check: PDFs start with "%PDF-".
  const magic =
    bytes.length >= 5
      ? [0, 1, 2, 3, 4].map((i) => String.fromCharCode(bytes[i])).join('')
      : '';
  if (magic !== '%PDF-') {
    return Response.json({ error: 'File does not look like a PDF' }, { status: 400 });
  }

  const base64 = Buffer.from(bytes).toString('base64');
  const dataUrl = `data:${PDF_MIME};base64,${base64}`;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const db = getDb();
  await db
    .prepare('INSERT INTO uploads (id, data_url, mime, created_at) VALUES (?, ?, ?, ?)')
    .run(id, dataUrl, PDF_MIME, now);

  return Response.json({ ok: true, id, url: `/api/uploads/${id}` }, { status: 201 });
}
