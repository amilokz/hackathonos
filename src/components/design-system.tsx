'use client';

/**
 * HackathonOS design system (organizer UI).
 *
 * Shared tokens:
 * - Font: Inter (loaded via next/font in the root layout), system sans fallback
 * - Page bg: #F8F9FC (cool gray) · Cards: white, rounded-xl, #EBEBEF hairline border,
 *   shadow 0 1px 2px rgba(16,24,40,.05)
 * - Primary indigo-600 (#4F46F5) · Success teal (#0AB39C) · Danger #EF4444 · Warning #F59E0B
 * - Page H1: 20-24px semibold #111827 · subtitle 13-14px #6B7280
 * - Card titles: 15-16px semibold · Stat numbers: 28-32px bold ·
 *   micro labels: 11-12px uppercase tracking-wide #6B7280
 *
 * Rules: NO emoji anywhere in organizer UI — use DsIcon (lucide-style
 * 24-viewBox, 2px-stroke inline SVGs). All primitives are data-driven.
 */

import { useMemo, useState, type ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/* Input primitive (shared with ui.tsx)                                */
/* ------------------------------------------------------------------ */

export const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100';

/* ------------------------------------------------------------------ */
/* Icons — inline lucide-style SVGs (24 viewBox, 2px stroke)            */
/* ------------------------------------------------------------------ */

type DsIconName =
  | 'users'
  | 'calendar'
  | 'trophy'
  | 'chart'
  | 'clock'
  | 'check'
  | 'megaphone'
  | 'inbox'
  | 'ticket'
  | 'sparkles'
  | 'rocket'
  | 'lightbulb'
  | 'radio'
  | 'hand'
  | 'search'
  | 'sort'
  | 'arrowUp'
  | 'arrowDown'
  | 'chevronLeft'
  | 'chevronRight'
  | 'plus'
  | 'x'
  | 'filter'
  | 'download'
  | 'alertTriangle'
  | 'flag'
  | 'copy'
  | 'pause'
  | 'lock'
  | 'trash'
  | 'camera'
  | 'mail'
  | 'send'
  | 'pin'
  | 'bot'
  | 'link'
  | 'laptop'
  | 'scale'
  | 'award'
  | 'building'
  | 'clipboardList'
  | 'messageSquare'
  | 'qrCode'
  | 'externalLink'
  | 'userCheck'
  | 'checkCircle'
  | 'eye'
  | 'settings'
  | 'pencil'
  | 'zap';

const DS_ICON_PATHS: Record<DsIconName, ReactNode> = {
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </>
  ),
  trophy: (
    <>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  megaphone: (
    <>
      <path d="m3 11 18-5v12L3 14v-3z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </>
  ),
  inbox: (
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </>
  ),
  ticket: (
    <>
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" />
      <path d="M13 17v2" />
      <path d="M13 11v2" />
    </>
  ),
  sparkles: (
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
  ),
  rocket: (
    <>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </>
  ),
  lightbulb: (
    <>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6" />
      <path d="M10 22h4" />
    </>
  ),
  radio: (
    <>
      <circle cx="12" cy="12" r="2" />
      <path d="M4.93 19.07a10 10 0 0 1 0-14.14" />
      <path d="M7.76 16.24a6 6 0 0 1 0-8.49" />
      <path d="M16.24 7.76a6 6 0 0 1 0 8.49" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </>
  ),
  hand: (
    <>
      <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
      <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
      <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  sort: (
    <>
      <path d="m21 16-4 4-4-4" />
      <path d="M17 20V4" />
      <path d="m3 8 4-4 4 4" />
      <path d="M7 4v16" />
    </>
  ),
  arrowUp: (
    <>
      <path d="m5 12 7-7 7 7" />
      <path d="M12 19V5" />
    </>
  ),
  arrowDown: (
    <>
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </>
  ),
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  plus: (
    <>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </>
  ),
  alertTriangle: (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  flag: (
    <>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </>
  ),
  copy: (
    <>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </>
  ),
  pause: (
    <>
      <rect x="14" y="4" width="4" height="16" rx="1" />
      <rect x="6" y="4" width="4" height="16" rx="1" />
    </>
  ),
  lock: (
    <>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </>
  ),
  camera: (
    <>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </>
  ),
  mail: (
    <>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </>
  ),
  send: (
    <>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </>
  ),
  pin: (
    <>
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9a2 2 0 0 1-1.11-1.79V6a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2z" />
    </>
  ),
  bot: (
    <>
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>
  ),
  laptop: (
    <path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16" />
  ),
  scale: (
    <>
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </>
  ),
  award: (
    <>
      <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
      <path d="M22 10v6" />
      <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
    </>
  ),
  building: (
    <>
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </>
  ),
  clipboardList: (
    <>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </>
  ),
  messageSquare: (
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  ),
  qrCode: (
    <>
      <rect width="5" height="5" x="3" y="3" rx="1" />
      <rect width="5" height="5" x="16" y="3" rx="1" />
      <rect width="5" height="5" x="3" y="16" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <path d="M21 21v.01" />
      <path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M3 12h.01" />
      <path d="M12 3h.01" />
      <path d="M12 16v.01" />
      <path d="M16 12h1" />
      <path d="M21 12v.01" />
      <path d="M12 21v-1" />
    </>
  ),
  externalLink: (
    <>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </>
  ),
  userCheck: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="m16 11 2 2 4-4" />
    </>
  ),
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  settings: (
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  pencil: (
    <>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </>
  ),
  zap: (
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
  ),
  x: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  filter: <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />,
  download: (
    <>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="m7 10 5 5 5-5" />
      <path d="M12 15V3" />
    </>
  ),
};

export function DsIcon({ name, className = 'h-5 w-5' }: { name: DsIconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {DS_ICON_PATHS[name]}
    </svg>
  );
}

export type { DsIconName };

/** Legacy emoji strings (still passed by older call sites) → SVG icons. */
const EMOJI_ICON_MAP: Record<string, DsIconName> = {
  '🚀': 'rocket',
  '🎫': 'ticket',
  '🎟️': 'ticket',
  '📢': 'megaphone',
  '📅': 'calendar',
  '👋': 'hand',
  '✅': 'check',
  '💡': 'lightbulb',
  '📡': 'radio',
  '👥': 'users',
  '⚖️': 'chart',
  '➕': 'plus',
};

export function emojiIcon(emoji: string, className = 'h-6 w-6'): ReactNode | null {
  const name = EMOJI_ICON_MAP[emoji];
  return name ? <DsIcon name={name} className={className} /> : null;
}

/* ------------------------------------------------------------------ */
/* Breadcrumb                                                          */
/* ------------------------------------------------------------------ */

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-slate-300">›</span>}
            {item.href ? (
              <a href={item.href} className="transition hover:text-indigo-600 hover:underline">
                {item.label}
              </a>
            ) : (
              <span className="font-medium text-slate-500">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* PageHeader — breadcrumbs above, title+subtitle LEFT, actions RIGHT   */
/* (stacks on mobile). `action` is the legacy prop, kept working.      */
/* ------------------------------------------------------------------ */

export function PageHeader({
  title,
  subtitle,
  actions,
  action,
  breadcrumbs,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** @deprecated use `actions` instead — kept for existing pages */
  action?: ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}) {
  const right = actions ?? action;
  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumb items={breadcrumbs} />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-[#111827] sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-1 text-[13px] text-[#6B7280] sm:text-sm">{subtitle}</p>}
        </div>
        {right && <div className="flex shrink-0 flex-wrap items-center gap-2">{right}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card helpers — titles per token (15-16px semibold)                   */
/* ------------------------------------------------------------------ */

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-[15px] font-semibold text-[#111827] sm:text-base ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`mt-1 text-[13px] text-[#6B7280] ${className}`}>{children}</p>;
}

/* ------------------------------------------------------------------ */
/* StatCard — micro uppercase label, 28-32px bold number, delta badge,  */
/* optional tinted icon chip or mini sparkline                         */
/* ------------------------------------------------------------------ */

const ICON_TINTS: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-600',
  teal: 'bg-[#0AB39C]/10 text-[#0B7C6E]',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  red: 'bg-red-50 text-red-600',
  slate: 'bg-slate-100 text-slate-500',
};

function Sparkline({ data }: { data: number[] }) {
  if (!data || data.length < 2) return null;
  const w = 72;
  const h = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => `${((i / (data.length - 1)) * w).toFixed(1)},${(h - 3 - ((v - min) / range) * (h - 6)).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-[72px] shrink-0" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="#4F46F5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StatCard({
  label,
  value,
  delta,
  deltaType = 'up',
  icon,
  iconTint = 'indigo',
  sparkline,
  hint,
  className = '',
}: {
  label: string;
  value: ReactNode;
  delta?: string;
  deltaType?: 'up' | 'down';
  icon?: ReactNode;
  iconTint?: keyof typeof ICON_TINTS;
  sparkline?: number[];
  hint?: string;
  className?: string;
}) {
  const good = deltaType === 'up';
  return (
    <div
      className={`rounded-xl border border-[#EBEBEF] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.05)] ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">{label}</p>
        {icon && (
          <span
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${ICON_TINTS[iconTint] ?? ICON_TINTS.indigo}`}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-[30px] font-bold leading-none tracking-tight text-[#111827]">{value}</p>
      {(delta || hint || sparkline) && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {delta && (
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  good ? 'bg-[#0AB39C]/10 text-[#0B7C6E]' : 'bg-[#EF4444]/10 text-[#DC2626]'
                }`}
              >
                <DsIcon name={good ? 'arrowUp' : 'arrowDown'} className="h-3 w-3" />
                {delta}
              </span>
            )}
            {hint && <span className="truncate text-xs text-[#6B7280]">{hint}</span>}
          </div>
          {sparkline && <Sparkline data={sparkline} />}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* StatusPill — status → color mapping                                 */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  published: 'bg-emerald-50 text-emerald-700',
  closed: 'bg-slate-200 text-slate-700',
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-[#0AB39C]/10 text-[#0B7C6E]',
  rejected: 'bg-red-50 text-red-700',
  active: 'bg-[#0AB39C]/10 text-[#0B7C6E]',
  expired: 'bg-slate-100 text-slate-500',
  sent: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
  skipped: 'bg-slate-100 text-slate-500',
  open: 'bg-[#0AB39C]/10 text-[#0B7C6E]',
  new: 'bg-indigo-600 text-white',
  unread: 'bg-indigo-50 text-indigo-700',
  read: 'bg-slate-100 text-slate-500',
  info: 'bg-indigo-50 text-indigo-700',
  deadline: 'bg-amber-50 text-amber-700',
  winner: 'bg-purple-50 text-purple-700',
  broadcast: 'bg-indigo-50 text-indigo-700',
  registration: 'bg-slate-100 text-slate-600',
  participant: 'bg-indigo-50 text-indigo-700',
  judge: 'bg-purple-50 text-purple-700',
  sponsor: 'bg-amber-50 text-amber-700',
  pinned: 'bg-indigo-50 text-indigo-700',
  'checked in': 'bg-emerald-50 text-emerald-700',
  'skipped (no key)': 'bg-slate-100 text-slate-500',
};

export function StatusPill({ status, className = '' }: { status: string; className?: string }) {
  const key = status.trim().toLowerCase();
  const style = STATUS_STYLES[key] ?? 'bg-slate-100 text-slate-600';
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${style} ${className}`}
    >
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* DataTable — dependency-free client table: search, sort, pagination   */
/* ------------------------------------------------------------------ */

export interface DataTableColumn<T> {
  /** unique key; also the default accessor into the row object */
  key: string;
  header: ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  /** custom cell renderer; otherwise the raw value is shown */
  render?: (row: T, index: number) => ReactNode;
  /** value used for sorting + searching when `render` is custom */
  value?: (row: T) => string | number | boolean | null | undefined;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyTitle?: string;
  emptyText?: string;
  className?: string;
}

const ALIGN_CLASS: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

function columnValue<T>(col: DataTableColumn<T>, row: T): string | number | boolean | null {
  if (col.value) return col.value(row) ?? null;
  const v = (row as unknown as Record<string, unknown>)[col.key];
  return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? v : null;
}

export function DataTable<T>({
  columns,
  rows,
  searchable = false,
  searchPlaceholder = 'Search…',
  pageSize = 10,
  emptyTitle = 'No results',
  emptyText = 'Try adjusting your search or filters.',
  className = '',
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows;
    if (q) {
      out = rows.filter((row) =>
        columns.some((col) => {
          const v = columnValue(col, row);
          return v != null && String(v).toLowerCase().includes(q);
        })
      );
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      if (col) {
        out = [...out].sort((a, b) => {
          const va = columnValue(col, a);
          const vb = columnValue(col, b);
          let cmp: number;
          if (typeof va === 'number' && typeof vb === 'number') cmp = va - vb;
          else cmp = String(va ?? '').localeCompare(String(vb ?? ''));
          return sortDir === 'asc' ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, columns, query, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  const toggleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      setSortKey(null);
      setSortDir('asc');
    }
    setPage(0);
  };

  return (
    <div
      className={`overflow-hidden rounded-xl border border-[#EBEBEF] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)] ${className}`}
    >
      {searchable && (
        <div className="border-b border-[#EBEBEF] p-3 sm:p-4">
          <div className="relative max-w-xs">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <DsIcon name="search" className="h-4 w-4" />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className={`${inputClass} pl-9`}
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[#EBEBEF] bg-[#F8F9FC]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] ${ALIGN_CLASS[col.align ?? 'left']}`}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 transition hover:text-[#111827]"
                      aria-label={`Sort by ${typeof col.header === 'string' ? col.header : col.key}`}
                    >
                      {col.header}
                      <DsIcon
                        name={sortKey === col.key ? (sortDir === 'asc' ? 'arrowUp' : 'arrowDown') : 'sort'}
                        className="h-3.5 w-3.5 opacity-60"
                      />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F1F4]">
            {pageRows.map((row, i) => (
              <tr key={start + i} className="transition hover:bg-[#F8F9FC]">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm text-slate-700 ${ALIGN_CLASS[col.align ?? 'left']}`}
                  >
                    {col.render ? col.render(row, start + i) : String(columnValue(col, row) ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageRows.length === 0 && (
        <div className="px-4 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#EBEBEF] bg-[#F8F9FC] text-slate-400">
            <DsIcon name="inbox" className="h-6 w-6" />
          </div>
          <p className="mt-4 text-[15px] font-semibold text-[#111827]">{emptyTitle}</p>
          <p className="mx-auto mt-1.5 max-w-sm text-[13px] text-[#6B7280]">{emptyText}</p>
        </div>
      )}

      <div className="flex flex-col gap-2 border-t border-[#EBEBEF] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-[#6B7280]">
          Showing {filtered.length === 0 ? 0 : start + 1}–{Math.min(start + pageSize, filtered.length)} of{' '}
          {filtered.length}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <DsIcon name="chevronLeft" className="h-3.5 w-3.5" />
            Prev
          </button>
          <span className="text-xs text-[#6B7280]">
            Page {safePage + 1} of {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <DsIcon name="chevronRight" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
