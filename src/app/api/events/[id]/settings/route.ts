import { getDb, migrate } from '@/lib/db';
import { ensureSettingsColumns } from '@/lib/settings-columns';
import { ensureBrandingColumns } from '@/lib/branding-columns';
import { isValidBrandColor, DEFAULT_BRAND } from '@/lib/brand';
import { requireOrganizerFromRequest, getOwnedEvent } from '@/lib/require-organizer';
import { isWhiteLabelEligible } from '@/lib/white-label';

export const dynamic = 'force-dynamic';

interface EventSettings {
  entry_fee: number;
  payment_instructions: string;
  white_label: boolean;
  custom_footer_text: string;
  require_team_approval: boolean;
  brand_color: string;
  brand_logo_url: string;
  brand_name: string;
}

async function readSettings(eventId: string): Promise<EventSettings> {
  await ensureSettingsColumns();
  await ensureBrandingColumns();
  const db = getDb();
  const row = await db
    .prepare(
      'SELECT entry_fee, payment_instructions, white_label, custom_footer_text, require_team_approval, brand_color, brand_logo_url, brand_name FROM events WHERE id = ?',
    )
    .get(eventId) as {
    entry_fee: number | null;
    payment_instructions: string | null;
    white_label: number | null;
    custom_footer_text: string | null;
    require_team_approval: number | null;
    brand_color: string | null;
    brand_logo_url: string | null;
    brand_name: string | null;
  };
  return {
    entry_fee: Number(row?.entry_fee ?? 0),
    payment_instructions: row?.payment_instructions ?? '',
    white_label: Boolean(row?.white_label),
    custom_footer_text: row?.custom_footer_text ?? '',
    require_team_approval: Boolean(row?.require_team_approval),
    brand_color: row?.brand_color ?? DEFAULT_BRAND,
    brand_logo_url: row?.brand_logo_url ?? '',
    brand_name: row?.brand_name ?? '',
  };
}

/** GET /api/events/[id]/settings — monetization settings (organizer only). */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  await migrate();
  const organizer = await requireOrganizerFromRequest(req);
  if (!organizer) return Response.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, organizer.id);
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });
  return Response.json({
    settings: await readSettings(params.id),
    plan: {
      plan: organizer.plan,
      white_label_granted: Boolean(organizer.white_label_granted),
      white_label_eligible: isWhiteLabelEligible(organizer.plan, organizer.white_label_granted),
    },
  });
}

/** PUT /api/events/[id]/settings — update monetization settings (organizer only). */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  await migrate();
  await ensureSettingsColumns();
  await ensureBrandingColumns();
  const organizer = await requireOrganizerFromRequest(req);
  if (!organizer) return Response.json({ error: 'Not signed in' }, { status: 401 });
  const event = await getOwnedEvent(params.id, organizer.id);
  if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

  let body: {
    entry_fee?: number;
    payment_instructions?: string;
    white_label?: boolean;
    custom_footer_text?: string;
    require_team_approval?: boolean;
    brand_color?: string;
    brand_logo_url?: string;
    brand_name?: string;
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

  // White label is a paid feature — never let a free-plan organizer enable it.
  if (
    body.white_label === true &&
    !isWhiteLabelEligible(organizer.plan, organizer.white_label_granted)
  ) {
    return Response.json({ error: 'White label requires a Pro plan' }, { status: 403 });
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
  if (body.require_team_approval !== undefined) {
    updates.push('require_team_approval = ?');
    values.push(body.require_team_approval ? 1 : 0);
  }
  // Branding — a free-form theming system; independent of the white-label
  // footer toggle (they compose: white label removes platform text, branding
  // recolors the page accents).
  if (body.brand_color !== undefined) {
    const v = String(body.brand_color).trim();
    if (!isValidBrandColor(v)) {
      return Response.json({ error: 'brand_color must be a #RRGGBB hex color' }, { status: 400 });
    }
    updates.push('brand_color = ?');
    values.push(v);
  }
  if (body.brand_logo_url !== undefined) {
    const v = String(body.brand_logo_url).trim();
    if (v.length > 2000) {
      return Response.json({ error: 'brand_logo_url is too long (max 2000 characters)' }, { status: 400 });
    }
    updates.push('brand_logo_url = ?');
    values.push(v);
  }
  if (body.brand_name !== undefined) {
    const v = String(body.brand_name).trim();
    if (v.length > 80) {
      return Response.json({ error: 'brand_name is too long (max 80 characters)' }, { status: 400 });
    }
    updates.push('brand_name = ?');
    values.push(v);
  }
  if (updates.length > 0) {
    values.push(params.id);
    await db.prepare(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  return Response.json({ settings: await readSettings(params.id) });
}
