import { Card, DsIcon } from '@/components/ui';
import EmptyState from '@/components/EmptyState';
import { SectionHeader, IconChip } from './icons';
import { timeAgo } from '@/lib/format';

export interface RecentTeam {
  id: string;
  name: string;
  event_id: string;
  event_name: string;
  created_at: string;
}

/** Latest team registrations across all of the organizer's events. */
export default function RecentRegistrations({
  teams,
  total,
  viewAllHref,
}: {
  teams: RecentTeam[];
  total: number;
  viewAllHref?: string;
}) {
  return (
    <Card className="p-6 transition hover:shadow-md">
      <SectionHeader
        icon="users"
        tint="indigo"
        title="Recent registrations"
        meta={
          total > 0 && (
            <p className="text-xs text-slate-400">
              Showing {teams.length} of {total}
            </p>
          )
        }
        viewAllHref={viewAllHref}
      />
      {teams.length === 0 ? (
        <EmptyState
          icon={<DsIcon name="users" className="h-6 w-6" />}
          title="No registrations yet"
          text="Teams will appear here as soon as they register for your published events."
          compact
        />
      ) : (
        <ul className="divide-y divide-slate-100">
          {teams.map((t) => (
            <li key={t.id}>
              <a
                href={`/dashboard/events/${t.event_id}#teams`}
                className="-mx-2 flex items-center gap-3.5 rounded-xl px-2 py-3 transition hover:bg-indigo-50/60"
              >
                <IconChip icon="users" tint="indigo" size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{t.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {t.event_name} · {timeAgo(t.created_at)}
                  </p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
