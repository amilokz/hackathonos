import { WHITE_LABEL_PLANS, PLAN_FREE } from './plans';

/**
 * White label gating — paid feature (Pro/Enterprise) with a per-organizer
 * manual override.
 *
 * - isWhiteLabelEligible(plan, granted): organizer-level eligibility.
 * - eventWhiteLabelActive(event, organizer): the single check every public
 *   page must use — requires BOTH the event's white_label toggle AND
 *   organizer eligibility, so a legacy white_label=1 on a free-plan
 *   organizer never renders.
 */

export interface WhiteLabelEligibility {
  plan?: string | null;
  white_label_granted?: number | boolean | null;
}

export interface WhiteLabelEventFlag {
  white_label?: number | boolean | null;
}

export function isWhiteLabelEligible(
  plan: string | null | undefined,
  granted: number | boolean | null | undefined,
): boolean {
  if (granted === 1 || granted === true) return true;
  const p = (plan ?? PLAN_FREE).toLowerCase();
  return (WHITE_LABEL_PLANS as readonly string[]).includes(p);
}

export function eventWhiteLabelActive(
  event: WhiteLabelEventFlag | null | undefined,
  organizer: WhiteLabelEligibility | null | undefined,
): boolean {
  if (!event || !event.white_label) return false;
  return isWhiteLabelEligible(organizer?.plan, organizer?.white_label_granted);
}
