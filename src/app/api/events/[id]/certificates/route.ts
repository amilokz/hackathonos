import { randomUUID } from 'node:crypto';
import { getDb, migrate } from '@/lib/db';
import { ensureSettingsColumns } from '@/lib/settings-columns';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';

export const dynamic = 'force-dynamic';

const CERT_TYPES = ['participant', 'winner', 'judge', 'sponsor'] as const;

function shortCode(): string {
  return randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
}

async function uniqueCode(db: ReturnType<typeof getDb>): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = shortCode();
    const hit = await db.prepare('SELECT 1 FROM certificates WHERE verification_code = ?').get(code);
    if (!hit) return code;
  }
  // Extremely unlikely fallback: longer code.
  return randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase();
}

/** GET /api/events/[id]/certificates — list certificates for an event (organizer only). */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  await migrate();
  const organizer = await requireOrganizerFromRequest(req);
  if (!organizer) return Response.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, organizer.id);
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  const db = getDb();
  const rows = await db
    .prepare(
      'SELECT id, recipient_name, recipient_email, type, verification_code, created_at FROM certificates WHERE event_id = ? ORDER BY created_at DESC',
    )
    .all(params.id);
  return Response.json({ certificates: rows });
}

interface CertBody {
  type?: string;
  /** Bulk lines: "Name" or "Name,email" — one per line. */
  lines?: string[];
  /** Alternative explicit entries. */
  entries?: { name?: string; email?: string }[];
}

/** POST /api/events/[id]/certificates — generate certificates (organizer only). */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  await migrate();
  await ensureSettingsColumns();
  const organizer = await requireOrganizerFromRequest(req);
  if (!organizer) return Response.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, organizer.id);
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  let body: CertBody;
  try {
    body = (await req.json()) as CertBody;
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

  const entries: { name: string; email: string }[] = [];
  if (Array.isArray(body.entries)) {
    for (const e of body.entries) {
      const name = (e.name ?? '').trim();
      if (name) entries.push({ name, email: (e.email ?? '').trim() });
    }
  } else if (Array.isArray(body.lines)) {
    for (const raw of body.lines) {
      const line = String(raw ?? '').trim();
      if (!line) continue;
      const comma = line.indexOf(',');
      if (comma === -1) {
        entries.push({ name: line, email: '' });
      } else {
        const name = line.slice(0, comma).trim();
        const email = line.slice(comma + 1).trim();
        if (name) entries.push({ name, email });
      }
    }
  }

  if (entries.length === 0) {
    return Response.json({ error: 'No names provided' }, { status: 400 });
  }
  if (entries.length > 2000) {
    return Response.json({ error: 'Too many entries (max 2000 per request)' }, { status: 400 });
  }

  const db = getDb();
  const now = new Date().toISOString();
  const created: { name: string; email: string; code: string }[] = [];
  for (const e of entries) {
    const code = await uniqueCode(db);
    created.push({ name: e.name, email: e.email, code });
  }
  await db.batch(
    created.map((c) => ({
      sql: 'INSERT INTO certificates (id, event_id, recipient_name, recipient_email, type, verification_code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [randomUUID(), params.id, c.name, c.email, type, c.code, now],
    })),
  );

  return Response.json({ created, count: created.length }, { status: 201 });
}
