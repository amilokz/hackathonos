'use client';

import { useState } from 'react';
import LogoutButton from '@/app/dashboard/LogoutButton';

export type OrganizerNavKey = 'dashboard' | 'events' | 'new';

const LINKS: { key: OrganizerNavKey; href: string; icon: string; label: string; desc: string }[] = [
  { key: 'dashboard', href: '/dashboard', icon: '🏠', label: 'Dashboard', desc: 'Overview & stats' },
  { key: 'events', href: '/dashboard#events', icon: '📅', label: 'Events', desc: 'All your hackathons' },
  { key: 'new', href: '/dashboard/events/new', icon: '➕', label: 'New event', desc: 'Start a new hackathon' },
];

function NavLinks({ active, onNavigate }: { active: OrganizerNavKey; onNavigate?: () => void }) {
  return (
    <ul className="space-y-1">
      {LINKS.map((l) => {
        const isActive = l.key === active;
        return (
          <li key={l.key}>
            <a
              href={l.href}
              onClick={onNavigate}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-3 transition ${
                isActive
                  ? 'bg-indigo-600 font-semibold text-white shadow-sm'
                  : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
              }`}
            >
              <span className="text-lg" aria-hidden="true">
                {l.icon}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm ${isActive ? 'text-white' : 'text-slate-800'}`}>
                  {l.label}
                </span>
                <span className={`block truncate text-xs ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {l.desc}
                </span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Top bar + responsive sidebar navigation for organizer pages.
 * Desktop: fixed left sidebar. Mobile: hamburger button opens the sidebar
 * as a slide-over drawer.
 */
export default function OrganizerShellNav({
  name,
  email,
  active,
}: {
  name: string;
  email: string;
  active: OrganizerNavKey;
}) {
  const [open, setOpen] = useState(false);

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
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 lg:hidden"
            >
              <span className="text-xl" aria-hidden="true">
                {open ? '✕' : '☰'}
              </span>
            </button>
            <a href="/dashboard" className="text-lg font-extrabold tracking-tight text-slate-900">
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
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 shrink-0 transform border-r border-slate-200 bg-white p-4 transition-transform lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Organizer navigation"
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-lg font-extrabold tracking-tight text-slate-900">
            Hackathon<span className="text-indigo-600">OS</span>
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
          >
            <span className="text-xl" aria-hidden="true">
              ✕
            </span>
          </button>
        </div>
        <NavLinks active={active} onNavigate={() => setOpen(false)} />
        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
          <p className="font-semibold text-slate-700">Signed in as</p>
          <p className="mt-0.5 truncate font-mono">{email}</p>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-20 hidden w-64 shrink-0 border-r border-slate-200 bg-white p-4 pt-20 lg:block"
        aria-label="Organizer navigation"
      >
        <NavLinks active={active} />
        <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
          <p className="font-semibold text-slate-700">Signed in as</p>
          <p className="mt-0.5 truncate font-mono">{email}</p>
        </div>
      </aside>
    </>
  );
}
