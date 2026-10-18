import { NextRequest, NextResponse } from 'next/server';
import { getDb, migrate } from '@/lib/db';
import { requireOrganizerFromRequest } from '@/lib/require-organizer';

/**
 * PATCH /api/contact/[id] — organizer-only. Marks a contact message as
 * read (or back to unread). Body: { "read": true | false }.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const org = await requireOrganizerFromRequest(req);
  if (!org) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  const { read } = (body ?? {}) as { read?: unknown };
  if (typeof read !== 'boolean')
    return NextResponse.json({ error: 'Body must be { "read": true | false }.' }, { status: 400 });

  await migrate();
  const db = getDb();
  const result = await db
    .prepare('UPDATE contact_messages SET read = ? WHERE id = ?')
    .run(read ? 1 : 0, params.id);

  if (result.changes === 0)
    return NextResponse.json({ error: 'Message not found.' }, { status: 404 });

  return NextResponse.json({ ok: true, read });
}
