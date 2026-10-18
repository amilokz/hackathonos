import { getDb, migrate } from '@/lib/db';
import { ensureCertificateColumns } from '@/lib/certificate-columns';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/events/[id]/certificates/templates/[templateId]
 * Remove a template (organizer only). Certificates already issued from it keep
 * their own pdf_url, so issued certificates are unaffected.
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string; templateId: string } },
) {
  await migrate();
  await ensureCertificateColumns();
  const organizer = await requireOrganizerFromRequest(req);
  if (!organizer) return Response.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, organizer.id);
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  const db = getDb();
  const template = (await db
    .prepare('SELECT id FROM certificate_templates WHERE id = ? AND event_id = ?')
    .get(params.templateId, params.id)) as { id: string } | undefined;
  if (!template) return Response.json({ error: 'Template not found' }, { status: 404 });

  await db.prepare('DELETE FROM certificate_templates WHERE id = ?').run(params.templateId);
  return Response.json({ ok: true });
}
