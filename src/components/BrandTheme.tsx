import type { CSSProperties, ReactNode } from 'react';
import { brandVars } from '@/lib/brand';

/**
 * Sets the brand CSS variables (--brand, --brand-dark, --brand-light,
 * --brand-rgb) on a wrapper element for a public event page. Descendant
 * components consume them via Tailwind arbitrary values like
 * `bg-[var(--brand)]` / `text-[var(--brand)]` / `bg-[rgb(var(--brand-rgb)/0.1)]`.
 *
 * Invalid/missing colors fall back to the default brand indigo, so pages
 * always render with a usable accent.
 */
export default function BrandTheme({
  color,
  children,
  className = '',
}: {
  color: string | null | undefined;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className} style={brandVars(color) as CSSProperties}>
      {children}
    </div>
  );
}
