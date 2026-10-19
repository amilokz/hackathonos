import { getDb, migrate } from '@/lib/db';
import { ensureOrganizerColumns } from '@/lib/organizer-columns';
import { isKnownPlan } from '@/lib/plans';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/plan — change an organizer's billing plan.
 *
 * There is no payment integration yet, so plan changes are a manual owner
 * action. This route is DISABLED unless the server sets ALLOW_PLAN_CHANGES=true;
 * unset (default) → 403 for every call.
 *
 * When enabled, anyone who can reach the server can call it, so only enable
 * it temporarily (or restrict it at the firewall) while you make the change,
 * then unset it again.
 *
 * Body: { "email": "organizer@example.com", "plan": "pro" | "enterprise" | "free",
 *         "white_label_granted": 0 | 1 (optional) }
 */
export async function POST(req: Request) {
  if (process.env.ALLOW_PLAN_CHANGES !== 'true') {
    return Response.json({ error: 'Plan changes are disabled' }, { status: 403 });
  }
  await migrate();
  await ensureOrganizerColumns();

  let body: { email?: unknown; plan?: unknown; white_label_granted?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const plan = typeof body.plan === 'string' ? body.plan.trim().toLowerCase() : '';
  if (!email) return Response.json({ error: 'email is required' }, { status: 400 });
  if (!isKnownPlan(plan)) {
    return Response.json({ error: 'plan must be one of: free, pro, enterprise' }, { status: 400 });
  }

  const db = getDb();
  const organizer = (await db.prepare('SELECT id, plan FROM organizers WHERE email = ?').get(email)) as
    | { id: string; plan: string | null }
    | undefined;
  if (!organizer) return Response.json({ error: 'Organizer not found' }, { status: 404 });

  if (body.white_label_granted !== undefined) {
    const granted = body.white_label_granted === 1 || body.white_label_granted === true ? 1 : 0;
    await db.prepare('UPDATE organizers SET plan = ?, white_label_granted = ? WHERE id = ?').run(plan, granted, organizer.id);
  } else {
    await db.prepare('UPDATE organizers SET plan = ? WHERE id = ?').run(plan, organizer.id);
  }

  return Response.json({
    email,
    plan,
    white_label_granted:
      body.white_label_granted === undefined
        ? undefined
        : body.white_label_granted === 1 || body.white_label_granted === true,
  });
}
