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

interface NavItem {
  key: OrganizerNavKey;
  href: string;
  icon: string;
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
        { key: 'overview', href: '/dashboard', icon: '🏠', label: 'Overview' },
        { key: 'events', href: '/dashboard#events', icon: '📅', label: 'Events' },
      ],
    },
    {
      title: 'Event workflow',
      items: [
        { key: 'participants', href: ev('#teams'), icon: '👥', label: 'Participants' },
        { key: 'teams', href: ev('#teams'), icon: '🤝', label: 'Teams' },
        { key: 'submissions', href: ev('/judging'), icon: '🚀', label: 'Submissions' },
        { key: 'judges', href: ev('#judges'), icon: '⚖️', label: 'Judges' },
        { key: 'certificates', href: ev('/certificates'), icon: '🎓', label: 'Certificates' },
        { key: 'analytics', href: ev('/analytics'), icon: '📊', label: 'Analytics' },
      ],
    },
    {
      title: 'Organizer',
      items: [
        { key: 'messages', href: '/dashboard/messages', icon: '💬', label: 'Messages' },
        { key: 'settings', href: ev('/settings'), icon: '⚙️', label: 'Settings' },
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
          ? 'bg-indigo-600 font-semibold text-white shadow-[0_4px_14px_rgba(79,70,229,0.45)]'
          : 'font-medium text-slate-400 hover:bg-white/[0.06] hover:text-white'
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base transition ${
          isActive ? 'bg-white/15' : 'bg-white/[0.05] group-hover:bg-white/10'
        }`}
        aria-hidden="true"
      >
        {item.icon}
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
      <span className="text-base" aria-hidden="true">
        ⏻
      </span>
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
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="mb-5 flex items-center gap-2 px-1">
        <span className="text-lg font-extrabold tracking-tight text-white">
          Hackathon<span className="text-indigo-400">OS</span>
        </span>
        <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300">
          Organizer
        </span>
      </div>

      {/* New event CTA */}
      <a
        href="/dashboard/events/new"
        onClick={onNavigate}
        className="mb-5 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(79,70,229,0.45)] transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
      >
        ➕ New event
      </a>

      {/* Grouped nav */}
      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto" aria-label="Organizer navigation">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
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
      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3.5">
        <p className="text-sm font-semibold text-white">Need help?</p>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
          Check the docs or get in touch with support.
        </p>
        <a
          href="/contact"
          onClick={onNavigate}
          className="mt-2.5 inline-flex w-full items-center justify-center rounded-lg bg-indigo-600/90 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
        >
          Help & FAQ
        </a>
      </div>

      {/* User card */}
      <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white"
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
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Close navigation' : 'Open navigation'}
              aria-expanded={open}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 lg:hidden"
            >
              <span className="text-xl" aria-hidden="true">
                {open ? '✕' : '☰'}
              </span>
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
        className={`fixed inset-y-0 left-0 z-50 flex w-[19rem] max-w-[85vw] flex-col bg-[#171233] p-4 shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
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
            <span className="text-xl" aria-hidden="true">
              ✕
            </span>
          </button>
        </div>
        <div className="min-h-0 flex-1">
          <SidebarBody
            groups={groups}
            active={active}
            name={name}
            email={email}
            onNavigate={() => setOpen(false)}
          />
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-20 hidden w-64 shrink-0 flex-col bg-[#171233] p-4 pt-20 lg:flex"
        aria-label="Organizer navigation"
      >
        <div className="min-h-0 flex-1">
          <SidebarBody groups={groups} active={active} name={name} email={email} />
        </div>
      </aside>
    </>
  );
}
