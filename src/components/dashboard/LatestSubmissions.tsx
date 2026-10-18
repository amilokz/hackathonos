import { Card, DsIcon } from '@/components/ui';
import EmptyState from '@/components/EmptyState';
import { SectionHeader, IconChip } from './icons';
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
  total,
  viewAllHref,
}: {
  projects: DashboardSubmission[];
  total: number;
  viewAllHref?: string;
}) {
  return (
    <Card className="p-6 transition hover:shadow-md">
      <SectionHeader
        icon="rocket"
        tint="emerald"
        title="Latest submissions"
        meta={
          total > 0 && (
            <p className="text-xs text-slate-400">
              Showing {projects.length} of {total}
            </p>
          )
        }
        viewAllHref={viewAllHref}
      />
      {projects.length === 0 ? (
        <EmptyState
          icon={<DsIcon name="lightbulb" className="h-6 w-6" />}
          title="No submissions yet"
          text="When teams submit their projects, the newest ones will show up here."
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
                <IconChip icon="rocket" tint="emerald" size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{p.title}</p>
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
