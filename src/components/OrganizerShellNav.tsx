'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LogoutButton from '@/app/dashboard/LogoutButton';

export type OrganizerNavKey =
  | 'overview'
  | 'events'
  | 'participants'
  | 'teams'
  | 'submissions'
  | 'judges'
  | 'certificates'
  | 'analytics'
  | 'messages'
  | 'settings';

/** Identifies the event that workflow items (teams, judges, …) operate on. */
export interface EventNavContext {
  id: string;
  slug: string;
}

type IconName =
  | 'home'
  | 'calendar'
  | 'users'
  | 'flag'
  | 'rocket'
  | 'scale'
  | 'award'
  | 'chart'
  | 'message'
  | 'settings'
  | 'plus'
  | 'logout'
  | 'menu'
  | 'x';

/** Lucide-style stroke icons — 24 viewBox, consistent 2px stroke. */
function Icon({ name, className = 'h-[18px] w-[18px]' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, React.ReactNode> = {
    home: (
      <>
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </>
    ),
    calendar: (
      <>
        <rect width="18" height="18" x="3" y="4" rx="2" />
        <path d="M16 2v4" />
        <path d="M8 2v4" />
        <path d="M3 10h18" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    flag: (
      <>
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" x2="4" y1="22" y2="15" />
      </>
    ),
    rocket: (
      <>
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
        <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
        <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
        <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
      </>
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
        <circle cx="12" cy="8" r="6" />
        <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
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
    message: <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />,
    settings: (
      <>
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    plus: (
      <>
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </>
    ),
    logout: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" x2="9" y1="12" y2="12" />
      </>
    ),
    menu: (
      <>
        <line x1="4" x2="20" y1="6" y2="6" />
        <line x1="4" x2="20" y1="12" y2="12" />
        <line x1="4" x2="20" y1="18" y2="18" />
      </>
    ),
    x: (
      <>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </>
    ),
  };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

interface NavItem {
  key: OrganizerNavKey;
  href: string;
  icon: IconName;
  label: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

/**
 * Workflow nav. Every item resolves to a real page — no dead links:
 * - Global items (Overview, Events, Messages, Settings) link to dashboard routes.
 * - Per-event items deep-link to the event's manage page section or dedicated
 *   sub-page when an event context is provided; otherwise they fall back to
 *   the dashboard events list so the organizer can pick an event first.
 */
function buildNav(ctx?: EventNavContext | null): NavGroup[] {
  const ev = (suffix: string) => (ctx ? `/dashboard/events/${ctx.id}${suffix}` : '/dashboard#events');
  return [
    {
      title: 'General',
      items: [
        { key: 'overview', href: '/dashboard', icon: 'home', label: 'Overview' },
        { key: 'events', href: '/dashboard#events', icon: 'calendar', label: 'Events' },
      ],
    },
    {
      title: 'Event workflow',
      items: [
        { key: 'participants', href: ev('#teams'), icon: 'users', label: 'Participants' },
        { key: 'teams', href: ev('#teams'), icon: 'flag', label: 'Teams' },
        { key: 'submissions', href: ev('/judging'), icon: 'rocket', label: 'Submissions' },
        { key: 'judges', href: ev('#judges'), icon: 'scale', label: 'Judges' },
        { key: 'certificates', href: ev('/certificates'), icon: 'award', label: 'Certificates' },
        { key: 'analytics', href: ev('/analytics'), icon: 'chart', label: 'Analytics' },
      ],
    },
    {
      title: 'Organizer',
      items: [
        { key: 'messages', href: '/dashboard/messages', icon: 'message', label: 'Messages' },
        { key: 'settings', href: ev('/settings'), icon: 'settings', label: 'Settings' },
      ],
    },
  ];
}

function NavItemLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: OrganizerNavKey;
  onNavigate?: () => void;
}) {
  const isActive = item.key === active;
  return (
    <a
      href={item.href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
        isActive
          ? 'bg-gradient-to-r from-indigo-600 to-violet-600 font-semibold text-white shadow-[0_6px_20px_rgba(99,102,241,0.45)]'
          : 'font-medium text-slate-400 hover:bg-white/[0.06] hover:text-slate-100'
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
          isActive ? 'bg-white/20 text-white' : 'bg-white/[0.05] text-slate-400 group-hover:bg-white/10 group-hover:text-slate-200'
        }`}
        aria-hidden="true"
      >
        <Icon name={item.icon} />
      </span>
      <span className="min-w-0 truncate">{item.label}</span>
    </a>
  );
}

/** Compact icon logout for the sidebar user card (top bar keeps the full button). */
function MiniLogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={logout}
      title="Log out"
      aria-label="Log out"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-slate-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
    >
      <Icon name="logout" className="h-4 w-4" />
    </button>
  );
}

function SidebarBody({
  groups,
  active,
  name,
  email,
  onNavigate,
}: {
  groups: NavGroup[];
  active: OrganizerNavKey;
  name: string;
  email: string;
  onNavigate?: () => void;
}) {
  const initial = (name || email || '?').trim().charAt(0).toUpperCase();
  return (
    <div className="flex min-h-full flex-col">
      {/* Brand */}
      <div className="mb-6 flex items-center gap-2 px-1">
        <span className="text-lg font-extrabold tracking-tight text-white">
          Hackathon<span className="text-indigo-400">OS</span>
        </span>
        <span className="rounded-full border border-indigo-400/30 bg-indigo-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-indigo-300">
          Organizer
        </span>
      </div>

      {/* New event CTA */}
      <a
        href="/dashboard/events/new"
        onClick={onNavigate}
        className="mb-6 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(99,102,241,0.45)] transition hover:from-indigo-500 hover:to-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
      >
        <Icon name="plus" className="h-4 w-4" />
        New event
      </a>

      {/* Grouped nav — natural flow, no internal scroll; whole sidebar scrolls as one unit */}
      <nav className="space-y-6" aria-label="Organizer navigation">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {g.title}
            </p>
            <ul className="space-y-1">
              {g.items.map((item) => (
                <li key={item.key}>
                  <NavItemLink item={item} active={active} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Help card */}
      <div className="mt-5 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
        <p className="text-sm font-semibold text-white">Need help?</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          Check the docs or get in touch with support.
        </p>
        <a
          href="/contact"
          onClick={onNavigate}
          className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:from-indigo-500 hover:to-violet-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        >
          Help & FAQ
        </a>
      </div>

      {/* User card */}
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white ring-2 ring-white/10"
          aria-hidden="true"
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{name}</p>
          <p className="truncate text-xs text-slate-400">{email}</p>
        </div>
        <MiniLogoutButton />
      </div>
    </div>
  );
}

/**
 * Top bar + workflow sidebar navigation for organizer pages.
 * Dark sidebar (desktop: fixed; mobile: hamburger slide-over drawer —
 * overlay click, link tap or Escape closes it).
 */
export default function OrganizerShellNav({
  name,
  email,
  active,
  eventContext,
}: {
  name: string;
  email: string;
  active: OrganizerNavKey;
  eventContext?: EventNavContext | null;
}) {
  const [open, setOpen] = useState(false);
  const groups = buildNav(eventContext);

  // Native-feel drawer: Escape closes it; lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* Top bar — solid white with a hairline bottom border per design tokens. */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Close navigation' : 'Open navigation'}
              aria-expanded={open}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 lg:hidden"
            >
              <Icon name={open ? 'x' : 'menu'} className="h-5 w-5" />
            </button>
            <a
              href="/dashboard"
              className="text-lg font-extrabold tracking-tight text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              Hackathon<span className="text-indigo-600">OS</span>
              <span className="ml-2 hidden rounded-full bg-indigo-100 px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wider text-indigo-700 sm:inline-block">
                Organizer
              </span>
            </a>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">{name}</p>
              <p className="max-w-[220px] truncate text-xs text-slate-400">{email}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={`sidebar-scroll fixed inset-y-0 left-0 z-50 flex w-[19rem] max-w-[85vw] flex-col overflow-y-auto bg-slate-900 p-5 shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Organizer navigation"
        aria-hidden={!open}
      >
        <div className="mb-4 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-slate-300 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>
        <SidebarBody
          groups={groups}
          active={active}
          name={name}
          email={email}
          onNavigate={() => setOpen(false)}
        />
      </aside>

      {/* Desktop sidebar — fixed 260px, dark navy #0F172A; whole sidebar scrolls as one unit */}
      <aside
        className="sidebar-scroll fixed inset-y-0 left-0 z-20 hidden w-[260px] shrink-0 flex-col overflow-y-auto bg-slate-900 p-5 pt-20 lg:flex"
        aria-label="Organizer navigation"
      >
        <SidebarBody groups={groups} active={active} name={name} email={email} />
      </aside>
    </>
  );
}
