/**
 * Organizer billing plans. White label is a paid feature: it is available
 * only to organizers on a Pro/Enterprise plan, or to organizers with the
 * per-account `white_label_granted` override set (see
 * src/lib/organizer-columns.ts).
 *
 * There is no payment integration yet — the owner upgrades/downgrades plans
 * manually (SQL or the admin API route). Defaults are safe: every organizer
 * starts on 'free'.
 */
export const PLAN_FREE = 'free';
export const PLAN_PRO = 'pro';
export const PLAN_ENTERPRISE = 'enterprise';

export type PlanId = typeof PLAN_FREE | typeof PLAN_PRO | typeof PLAN_ENTERPRISE;

export const PLANS: readonly PlanId[] = [PLAN_FREE, PLAN_PRO, PLAN_ENTERPRISE];

/** Plans that include white label. */
export const WHITE_LABEL_PLANS: readonly PlanId[] = [PLAN_PRO, PLAN_ENTERPRISE];

/** Display label for a plan id; falls back to 'Free' for unknown values. */
export function planLabel(plan: string | null | undefined): string {
  switch ((plan ?? PLAN_FREE).toLowerCase()) {
    case PLAN_PRO:
      return 'Pro';
    case PLAN_ENTERPRISE:
      return 'Enterprise';
    default:
      return 'Free';
  }
}

/** True when the value is a known plan id (case-insensitive). */
export function isKnownPlan(plan: string): plan is PlanId {
  return (PLANS as readonly string[]).includes(plan.toLowerCase());
}
