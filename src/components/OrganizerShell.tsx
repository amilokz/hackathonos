import type { ReactNode } from 'react';
import OrganizerShellNav, { type OrganizerNavKey, type EventNavContext } from './OrganizerShellNav';

/**
 * Consistent organizer layout: top bar with sign-out, left workflow sidebar nav
 * (collapses to a hamburger drawer on mobile), content area.
 * Wraps the dashboard home, the event manage page, analytics and check-in.
 */
export default function OrganizerShell({
  organizer,
  active = 'overview',
  eventContext,
  dark = false,
  children,
}: {
  organizer: { name: string; email: string };
  active?: OrganizerNavKey;
  eventContext?: EventNavContext | null;
  dark?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`min-h-screen ${dark ? 'bg-slate-950' : 'bg-canvas'}`}>
      <OrganizerShellNav name={organizer.name} email={organizer.email} active={active} eventContext={eventContext} />
      <div className="lg:pl-[260px]">
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
