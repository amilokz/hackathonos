/**
 * Brand-theming helpers for the event branding system.
 *
 * Public event pages expose the event's brand color through CSS variables
 * (`--brand`, `--brand-dark`, `--brand-light`, `--brand-rgb`) set on a
 * wrapper element; components use Tailwind arbitrary values such as
 * `bg-[var(--brand)]` or `bg-[rgb(var(--brand-rgb)/0.1)]` to pick up the
 * accent. The *-dark shade is precomputed server-side so hover states do
 * not need runtime color math; --brand-rgb carries the raw triplet for
 * alpha blends (Tailwind v3 cannot apply opacity modifiers to var() hexes).
 *
 * Plain TypeScript — safe to import in both server and client code.
 */

export const DEFAULT_BRAND = '#4F46E5';

export const BRAND_PRESETS = [
  { name: 'Indigo', hex: '#4F46E5' },
  { name: 'Violet', hex: '#7C3AED' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Amber', hex: '#D97706' },
  { name: 'Rose', hex: '#E11D48' },
  { name: 'Sky', hex: '#0284C7' },
  { name: 'Slate', hex: '#334155' },
  { name: 'Black', hex: '#111827' },
] as const;

export function isValidBrandColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

/** Invalid/missing values fall back to the default — never a broken var. */
export function normalizeBrandColor(value: string | null | undefined): string {
  if (value && isValidBrandColor(value.trim())) return value.trim();
  return DEFAULT_BRAND;
}

function hexToRgbTuple(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbTupleToHex([r, g, b]: [number, number, number]): string {
  const to = (v: number) =>
    Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

/** Mix `hex` toward `target` by `amount` (0..1). */
function mix(hex: string, target: [number, number, number], amount: number): string {
  const [r, g, b] = hexToRgbTuple(hex);
  return rgbTupleToHex([
    r + (target[0] - r) * amount,
    g + (target[1] - g) * amount,
    b + (target[2] - b) * amount,
  ]);
}

/** Darker shade of the brand color (hover states). */
export function darkenHex(hex: string, amount = 0.22): string {
  return mix(normalizeBrandColor(hex), [0, 0, 0], amount);
}

/** Lighter tint of the brand color (light text/icons on dark backgrounds). */
export function lightenHex(hex: string, amount = 0.55): string {
  return mix(normalizeBrandColor(hex), [255, 255, 255], amount);
}

export interface BrandVars {
  '--brand': string;
  '--brand-dark': string;
  '--brand-light': string;
  '--brand-rgb': string;
}

/**
 * Compute the CSS custom properties for a brand color. Missing/invalid
 * colors fall back to DEFAULT_BRAND, so every public page always has a
 * usable accent.
 */
export function brandVars(color: string | null | undefined): BrandVars {
  const c = normalizeBrandColor(color);
  const [r, g, b] = hexToRgbTuple(c);
  return {
    '--brand': c,
    '--brand-dark': darkenHex(c),
    '--brand-light': lightenHex(c),
    '--brand-rgb': `${r}, ${g}, ${b}`,
  };
}

/** Resolve the public header name: explicit brand name, else the event name. */
export function brandName(brand: string | null | undefined, eventName: string): string {
  const b = (brand ?? '').trim();
  return b || eventName;
}
