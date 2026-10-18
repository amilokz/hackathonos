import { Card } from '@/components/ui';
import EmptyState from '@/components/EmptyState';
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
  viewAllHref,
}: {
  teams: RecentTeam[];
  viewAllHref?: string;
}) {
  return (
    <Card className="p-6 transition hover:shadow-md">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight text-slate-900">👥 Recent registrations</h2>
        {viewAllHref && (
          <a
            href={viewAllHref}
            className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-800 hover:underline"
          >
            View all →
          </a>
        )}
      </div>
      {teams.length === 0 ? (
        <EmptyState
          icon="👋"
          title="No registrations yet"
          description="Teams will appear here as soon as they register for your published events."
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
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-xl"
                  aria-hidden="true"
                >
                  👥
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{t.name}</p>
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
