import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest } from '@/lib/require-organizer';

export const dynamic = 'force-dynamic';

const ALLOWED_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_BYTES = 1024 * 1024; // 1MB

/**
 * POST /api/uploads — organizer-only image upload.
 * Accepts multipart/form-data with a single `file` field.
 * Stores the image as a data URL in the uploads table and returns
 * { ok: true, id, url: "/api/uploads/<id>" }.
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
  if (!ALLOWED_MIMES.includes(file.type)) {
    return Response.json(
      { error: 'Only PNG, JPEG, WebP or SVG images are allowed' },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: 'Image must be smaller than 1MB' }, { status: 400 });
  }
  if (file.size === 0) {
    return Response.json({ error: 'Empty file' }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const base64 = Buffer.from(bytes).toString('base64');
  const dataUrl = `data:${file.type};base64,${base64}`;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const db = getDb();
  await db
    .prepare('INSERT INTO uploads (id, data_url, mime, created_at) VALUES (?, ?, ?, ?)')
    .run(id, dataUrl, file.type, now);

  return Response.json({ ok: true, id, url: `/api/uploads/${id}` }, { status: 201 });
}
