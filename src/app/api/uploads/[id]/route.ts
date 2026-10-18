import { getDb, migrate } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/uploads/[id] — serve an uploaded image (public, no auth).
 * Returns raw bytes with the stored Content-Type and long-lived caching.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  await migrate();
  const db = getDb();
  const row = (await db
    .prepare('SELECT data_url, mime FROM uploads WHERE id = ?')
    .get(params.id)) as { data_url: string; mime: string } | undefined;

  if (!row) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const match = /^data:([^;]+);base64,(.+)$/.exec(row.data_url);
  if (!match) {
    return Response.json({ error: 'Corrupt upload' }, { status: 500 });
  }
  const [, mime, base64] = match;
  const bytes = Buffer.from(base64, 'base64');

  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': mime || row.mime,
      'Content-Length': String(bytes.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
