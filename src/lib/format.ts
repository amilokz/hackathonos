/**
 * Shared display formatters — edge-case safe.
 * Every formatter degrades gracefully on empty/invalid input
 * instead of rendering raw junk into the page.
 */

/** "2026-10-18" → "Oct 18, 2026". Empty/invalid → ''. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const trimmed = String(iso).trim();
  if (!trimmed) return '';
  // Plain YYYY-MM-DD: parse as local time to avoid timezone-day shifts.
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00` : trimmed);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Long-form date used on certificates/verification: "18 October 2026". Empty/invalid → ''. */
export function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(String(iso).trim());
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Entry fee display: 0/empty/NaN → 'Free', otherwise thousands-separated.
 * The currency is the organizer's local currency (configured in settings).
 */
export function formatEntryFee(fee: number | string | null | undefined): string {
  const n = typeof fee === 'string' ? Number(fee) : (fee ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 'Free';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);
}
