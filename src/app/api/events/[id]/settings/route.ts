import { getDb, migrate } from '@/lib/db';
import { ensureSettingsColumns } from '@/lib/settings-columns';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';

export const dynamic = 'force-dynamic';

interface EventSettings {
  entry_fee: number;
  payment_instructions: string;
  white_label: boolean;
  custom_footer_text: string;
}

async function readSettings(eventId: string): Promise<EventSettings> {
  await ensureSettingsColumns();
  const db = getDb();
  const row = await db
    .prepare(
      'SELECT entry_fee, payment_instructions, white_label, custom_footer_text FROM events WHERE id = ?',
    )
    .get(eventId) as {
    entry_fee: number | null;
    payment_instructions: string | null;
    white_label: number | null;
    custom_footer_text: string | null;
  };
  return {
    entry_fee: Number(row?.entry_fee ?? 0),
    payment_instructions: row?.payment_instructions ?? '',
    white_label: Boolean(row?.white_label),
    custom_footer_text: row?.custom_footer_text ?? '',
  };
}

/** GET /api/events/[id]/settings — monetization settings (organizer only). */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  await migrate();
  const organizer = await requireOrganizerFromRequest(req);
  if (!organizer) return Response.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, organizer.id);
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });
  return Response.json({ settings: await readSettings(params.id) });
}

/** PUT /api/events/[id]/settings — update monetization settings (organizer only). */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  await migrate();
  await ensureSettingsColumns();
  const organizer = await requireOrganizerFromRequest(req);
  if (!organizer) return Response.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, organizer.id);
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  let body: {
    entry_fee?: number;
    payment_instructions?: string;
    white_label?: boolean;
    custom_footer_text?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const entryFee = body.entry_fee === undefined ? undefined : Number(body.entry_fee);
  if (entryFee !== undefined && (!Number.isFinite(entryFee) || entryFee < 0)) {
    return Response.json({ error: 'entry_fee must be a non-negative number' }, { status: 400 });
  }

  const db = getDb();
  const updates: string[] = [];
  const values: unknown[] = [];
  if (entryFee !== undefined) {
    updates.push('entry_fee = ?');
    values.push(entryFee);
  }
  if (body.payment_instructions !== undefined) {
    updates.push('payment_instructions = ?');
    values.push(String(body.payment_instructions));
  }
  if (body.white_label !== undefined) {
    updates.push('white_label = ?');
    values.push(body.white_label ? 1 : 0);
  }
  if (body.custom_footer_text !== undefined) {
    updates.push('custom_footer_text = ?');
    values.push(String(body.custom_footer_text));
  }
  if (updates.length > 0) {
    values.push(params.id);
    await db.prepare(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  return Response.json({ settings: await readSettings(params.id) });
}
