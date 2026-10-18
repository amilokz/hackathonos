import { Card } from '@/components/ui';
import EmptyState from '@/components/EmptyState';
import { timeAgo } from '@/lib/format';

export interface DashboardSubmission {
  id: string;
  title: string;
  team_name: string;
  event_id: string;
  event_name: string;
  created_at: string;
}

/** Latest project submissions across all of the organizer's events. */
export default function LatestSubmissions({
  projects,
  viewAllHref,
}: {
  projects: DashboardSubmission[];
  viewAllHref?: string;
}) {
  return (
    <Card className="p-6 transition hover:shadow-md">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight text-slate-900">🚀 Latest submissions</h2>
        {viewAllHref && (
          <a
            href={viewAllHref}
            className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-800 hover:underline"
          >
            View all →
          </a>
        )}
      </div>
      {projects.length === 0 ? (
        <EmptyState
          icon="💡"
          title="No submissions yet"
          description="When teams submit their projects, the newest ones will show up here."
          compact
        />
      ) : (
        <ul className="divide-y divide-slate-100">
          {projects.map((p) => (
            <li key={p.id}>
              <a
                href={`/dashboard/events/${p.event_id}`}
                className="-mx-2 flex items-center gap-3.5 rounded-xl px-2 py-3 transition hover:bg-indigo-50/60"
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-xl"
                  aria-hidden="true"
                >
                  🚀
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{p.title}</p>
                  <p className="truncate text-xs text-slate-500">
                    {p.team_name} · {p.event_name} · {timeAgo(p.created_at)}
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
