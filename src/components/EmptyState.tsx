import type { ReactNode } from 'react';
import { LinkButton } from './ui';
import { emojiIcon } from './design-system';

/** Strip emoji pictographs so legacy labels render as plain text (ES5-safe — no \p{...} unicode property escapes). */
function stripEmoji(s: string): string {
  return s
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') // astral-plane emoji (surrogate pairs)
    .replace(/[☀-➿⬀-⯿]/g, '')
    .replace(/[️‍]/g, '') // variation selector + zero-width joiner
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Friendly empty state — used everywhere an organizer list has nothing to
 * show yet. Never a blank page: every list gets an icon, a clear message
 * and (optionally) a call-to-action button.
 *
 * Design tokens: centered, gray icon SVG in a tinted circle, 15px semibold
 * title (#111827), 13px gray body (#6B7280). NO emoji — legacy `icon` emoji
 * strings are automatically mapped to SVG icons, and legacy `actionLabel`
 * emoji is stripped.
 */
export default function EmptyState({
  icon,
  title,
  description,
  text,
  actionLabel,
  actionHref,
  action,
  compact = false,
}: {
  /** SVG ReactNode preferred; legacy emoji strings are mapped to SVGs */
  icon?: string | ReactNode;
  title: string;
  /** @deprecated use `text` instead — kept for existing pages */
  description?: string;
  text?: string;
  /** @deprecated use `action` (ReactNode) instead — kept for existing pages */
  actionLabel?: string;
  /** @deprecated pairs with actionLabel — kept for existing pages */
  actionHref?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  const body = text ?? description ?? '';
  const renderedIcon =
    typeof icon === 'string' ? (emojiIcon(icon) ?? stripEmoji(icon)) : icon;
  const legacyAction =
    actionLabel && actionHref ? (
      <LinkButton href={actionHref}>{stripEmoji(actionLabel)}</LinkButton>
    ) : null;

  return (
    <div className={`text-center ${compact ? 'py-6' : 'py-12'}`}>
      {renderedIcon ? (
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#EBEBEF] bg-[#F8F9FC] text-slate-400">
          {renderedIcon}
        </div>
      ) : null}
      <p className="mt-4 text-[15px] font-semibold text-[#111827]">{title}</p>
      {body && <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-[#6B7280]">{body}</p>}
      {(action || legacyAction) && <div className="mt-5">{action ?? legacyAction}</div>}
    </div>
  );
}
