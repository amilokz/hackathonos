import type { ReactNode } from 'react';
import OrganizerShellNav, { type OrganizerNavKey } from './OrganizerShellNav';

/**
 * Consistent organizer layout: top bar with sign-out, left sidebar nav
 * (collapses to a hamburger drawer on mobile), content area.
 * Wraps the dashboard home, the event manage page, analytics and check-in.
 */
export default function OrganizerShell({
  organizer,
  active = 'dashboard',
  dark = false,
  children,
}: {
  organizer: { name: string; email: string };
  active?: OrganizerNavKey;
  dark?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`min-h-screen ${dark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <OrganizerShellNav name={organizer.name} email={organizer.email} active={active} />
      <div className="lg:pl-64">
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
