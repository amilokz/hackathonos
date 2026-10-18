'use client';

import { useMemo } from 'react';
import { PageHeader, LinkButton, DsIcon } from '@/components/ui';

function greetingFor(d: Date): string {
  const h = d.getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Velzon-style dashboard greeting header. Time-aware greeting computed in the
 * browser so it matches the organizer's local timezone, with today's date and
 * the primary "+ New event" CTA on the right. Rendered through the shared
 * PageHeader primitive (design-system) per the design tokens.
 */
export default function DashboardGreeting({ name }: { name: string }) {
  const { title, dateLine } = useMemo(() => {
    const now = new Date();
    const first = (name || '').trim().split(/\s+/)[0] || 'there';
    return {
      title: `${greetingFor(now)}, ${first}`,
      dateLine: now.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    };
  }, [name]);

  return (
    <PageHeader
      title={title}
      subtitle="Here's what's happening with your hackathons."
      actions={
        <>
          <span className="hidden text-[13px] font-medium text-[#6B7280] md:block">{dateLine}</span>
          <LinkButton href="/dashboard/events/new">
            <DsIcon name="plus" className="h-4 w-4" />
            New event
          </LinkButton>
        </>
      }
    />
  );
}
