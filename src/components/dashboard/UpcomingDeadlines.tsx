import { Card, DsIcon } from '@/components/ui';
import EmptyState from '@/components/EmptyState';
import { SectionHeader, DashIcon } from './icons';
import { formatDate } from '@/lib/format';

export interface DeadlineEvent {
  id: string;
  name: string;
  end_date: string;
}

function parseEndDate(endDate: string): Date | null {
  const trimmed = String(endDate ?? '').trim();
  if (!trimmed) return null;
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00` : trimmed);
  return isNaN(d.getTime()) ? null : d;
}

/** "in 3d 4h" / "in 5h 20m" / "in 40m", computed server-side at render time. */
function countdown(endDate: string): string {
  const d = parseEndDate(endDate);
  if (!d) return '';
  const diffMs = d.getTime() - Date.now();
  if (diffMs <= 0) return 'ending now';
  const minutes = Math.floor(diffMs / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${minutes % 60}m`;
  return `in ${minutes}m`;
}

/** True when the deadline is less than 24h away — gets the amber urgency pill. */
function isUrgent(endDate: string): boolean {
  const d = parseEndDate(endDate);
  if (!d) return false;
  return d.getTime() - Date.now() < 24 * 60 * 60 * 1000;
}

export function filterUpcomingDeadlines(events: DeadlineEvent[], limit = 5): DeadlineEvent[] {
  return events
    .filter((e) => {
      const d = parseEndDate(e.end_date);
      return d !== null && d.getTime() > Date.now();
    })
    .slice(0, limit);
}

/** Upcoming deadlines for published events, with server-side countdowns. */
export default function UpcomingDeadlines({
  events,
  total,
  viewAllHref,
}: {
  events: DeadlineEvent[];
  total: number;
  viewAllHref?: string;
}) {
  return (
    <Card className="p-6 transition hover:shadow-md">
      <SectionHeader
        icon="clock"
        tint="amber"
        title="Upcoming deadlines"
        meta={
          total > 0 && (
            <p className="text-xs text-slate-400">
              Showing {events.length} of {total}
            </p>
          )
        }
        viewAllHref={viewAllHref}
      />
      {events.length === 0 ? (
        <EmptyState
          icon={<DsIcon name="calendar" className="h-6 w-6" />}
          title="No upcoming deadlines"
          text="Publish an event with an end date and it will show up here with a live countdown."
          compact
        />
      ) : (
        <ul className="space-y-2.5">
          {events.map((e) => {
            const urgent = isUrgent(e.end_date);
            return (
              <li key={e.id}>
                <a
                  href={`/dashboard/events/${e.id}`}
                  className="flex items-center gap-3.5 rounded-xl border border-slate-100 bg-white px-4 py-3.5 transition hover:border-indigo-200 hover:bg-indigo-50/60 hover:shadow-sm"
                >
                  <span
                    className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      urgent ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'
                    }`}
                    aria-hidden="true"
                  >
                    <DashIcon name="clock" className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{e.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">Ends {formatDate(e.end_date)}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                      urgent ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    {countdown(e.end_date)}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
